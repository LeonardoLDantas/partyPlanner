import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { roadmapStages } from '../constants/roadmap';
import { apiBaseUrl } from '../config/api';
import { partyApi } from '../services/partyApi';
import { AuthSession, GuestStatus, Party } from '../types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const guestStatuses: GuestStatus[] = ['Confirmado', 'Pendente', 'Recusou'];

type PlannerSection = 'Painel' | 'Planejar' | 'Operacao' | 'Ajustes';
type PartyForm = { name: string; category: string; date: string; location: string; estimatedBudget: string };
type TaskForm = { title: string; assignee: string };
type GuestForm = { name: string; group: string; status: GuestStatus };
type BudgetForm = { label: string; category: string; amount: string };

const emptyPartyForm: PartyForm = { name: '', category: '', date: '', location: '', estimatedBudget: '' };
const emptyTaskForm: TaskForm = { title: '', assignee: '' };
const emptyGuestForm: GuestForm = { name: '', group: '', status: 'Pendente' };
const emptyBudgetForm: BudgetForm = { label: '', category: '', amount: '' };

type PlannerHomeProps = {
  session: AuthSession;
  onLogout: () => Promise<void> | void;
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => Promise<void> | void;
  onInformationalEvent: (message: string) => void;
};

export function PlannerHome({
  session,
  onLogout,
  notificationsEnabled,
  onNotificationsChange,
  onInformationalEvent,
}: PlannerHomeProps) {
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState<PlannerSection>('Painel');
  const [menuOpen, setMenuOpen] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partyForm, setPartyForm] = useState<PartyForm>(emptyPartyForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [guestForm, setGuestForm] = useState<GuestForm>(emptyGuestForm);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>(emptyBudgetForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedParty = useMemo(
    () => parties.find((party) => party.id === selectedPartyId) ?? parties[0],
    [parties, selectedPartyId]
  );

  const globalConfirmedGuests = parties.reduce(
    (count, party) => count + party.guests.filter((guest) => guest.status === 'Confirmado').length,
    0
  );
  const globalBudget = parties.reduce((sum, party) => sum + party.budget.spent, 0);
  const completedTasks = selectedParty?.tasks.filter((task) => task.done).length ?? 0;
  const confirmedGuests =
    selectedParty?.guests.filter((guest) => guest.status === 'Confirmado').length ?? 0;
  const budgetProgress =
    selectedParty && selectedParty.budget.estimated > 0
      ? Math.round((selectedParty.budget.spent / selectedParty.budget.estimated) * 100)
      : 0;

  useEffect(() => {
    async function loadParties() {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const remoteParties = await partyApi.getParties();
        setParties(remoteParties);
        setSelectedPartyId((current) => current || remoteParties[0]?.id || '');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel carregar a API.');
      } finally {
        setIsLoading(false);
      }
    }

    loadParties();
  }, []);

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: menuOpen ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [menuAnimation, menuOpen]);

  function syncParty(updatedParty: Party) {
    setParties((current) =>
      current.some((party) => party.id === updatedParty.id)
        ? current.map((party) => (party.id === updatedParty.id ? updatedParty : party))
        : [updatedParty, ...current]
    );
    setSelectedPartyId(updatedParty.id);
  }

  async function handleCreateParty() {
    if (!partyForm.name.trim()) return;
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const nextParty = await partyApi.createParty({
        name: partyForm.name.trim(),
        category: partyForm.category.trim(),
        date: partyForm.date.trim(),
        location: partyForm.location.trim(),
        estimatedBudget: Number(partyForm.estimatedBudget) || 0,
      });
      syncParty(nextParty);
      setPartyForm(emptyPartyForm);
      setActiveSection('Painel');
      onInformationalEvent(`Festa "${nextParty.name}" criada com sucesso.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel criar a festa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateTask() {
    if (!selectedParty || !taskForm.title.trim()) return;
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      syncParty(await partyApi.createTask(selectedParty.id, taskForm));
      setTaskForm(emptyTaskForm);
      onInformationalEvent('Tarefa adicionada com sucesso.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel criar a tarefa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateGuest() {
    if (!selectedParty || !guestForm.name.trim()) return;
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      syncParty(await partyApi.createGuest(selectedParty.id, guestForm));
      setGuestForm(emptyGuestForm);
      onInformationalEvent('Convidado salvo com sucesso.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel criar o convidado.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateBudgetItem() {
    if (!selectedParty || !budgetForm.label.trim()) return;
    const amount = Number(budgetForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      syncParty(await partyApi.createBudgetItem(selectedParty.id, { ...budgetForm, amount }));
      setBudgetForm(emptyBudgetForm);
      onInformationalEvent('Despesa adicionada com sucesso.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel criar a despesa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleTask(taskId: string) {
    if (!selectedParty) return;
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      syncParty(await partyApi.toggleTask(selectedParty.id, taskId));
      onInformationalEvent('Status da tarefa atualizado.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel atualizar a tarefa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const navItems: Array<{ id: PlannerSection; icon: string; title: string }> = [
    { id: 'Painel', icon: 'P', title: 'Painel' },
    { id: 'Planejar', icon: '+', title: 'Planejar' },
    { id: 'Operacao', icon: 'O', title: 'Operacao' },
    { id: 'Ajustes', icon: 'A', title: 'Ajustes' },
  ];

  const sidebarWidth = Math.min(168, width * 0.44);
  const contentShift = Math.max(112, sidebarWidth - 10);

  const sidebarTranslateX = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });

  const contentTranslateX = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentShift],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.layout}>
        <Animated.View
          pointerEvents={menuOpen ? 'auto' : 'none'}
          style={[
            styles.sidebarPanel,
            {
              width: sidebarWidth,
              transform: [{ translateX: sidebarTranslateX }],
              opacity: menuAnimation,
            },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={styles.brand}>Party Planner</Text>
          </View>

          <View style={styles.sidebarList}>
            {navItems.map((item) => {
              const isActive = item.id === activeSection;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                  onPress={() => {
                    setActiveSection(item.id);
                    setMenuOpen(false);
                  }}
                >
                  <Text style={[styles.sidebarIcon, isActive && styles.sidebarIconActive]}>
                    {item.icon}
                  </Text>
                  <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.mainStage,
            {
              transform: [{ translateX: contentTranslateX }],
            },
          ]}
        >
          <ScrollView style={styles.mainContent} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable
              style={styles.hamburger}
              onPress={() => setMenuOpen((current) => !current)}
            >
              <View style={styles.hamburgerLines}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </Pressable>
            <Text style={styles.topBarLabel}>{activeSection}</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.overline}>Party Planner</Text>
            <Text style={styles.heroTitle}>Navbar lateral esquerda expansivel</Text>
            <Text style={styles.heroSubtitle}>
              Ao tocar no icone, o menu lateral abre empurrando o conteudo da pagina para o lado.
            </Text>
            <Text style={styles.apiHint}>API: {apiBaseUrl}</Text>
            <Text style={styles.accountHint}>
              {session.user.name} | {session.user.email}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{parties.length}</Text>
              <Text style={styles.statLabel}>Festas</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{globalConfirmedGuests}</Text>
              <Text style={styles.statLabel}>Confirmados</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{currencyFormatter.format(globalBudget)}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.card}><ActivityIndicator size="large" color="#1f3a5f" /></View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Falha de integracao</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {activeSection !== 'Ajustes' ? (
            <>
              <Text style={styles.sectionTitle}>Minhas festas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partyList}>
                {parties.map((party) => {
                  const isSelected = party.id === selectedParty?.id;
                  return (
                    <Pressable
                      key={party.id}
                      style={[styles.partyCard, isSelected && styles.partyCardSelected]}
                      onPress={() => setSelectedPartyId(party.id)}
                    >
                      <Text style={[styles.partyCardCategory, isSelected && styles.partyCardSelectedText]}>{party.category}</Text>
                      <Text style={[styles.partyCardTitle, isSelected && styles.partyCardSelectedText]}>{party.name}</Text>
                      <Text style={[styles.partyCardMeta, isSelected && styles.partyCardSelectedText]}>{party.date}</Text>
                      <Text style={[styles.partyCardMeta, isSelected && styles.partyCardSelectedText]}>{party.location}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {activeSection === 'Painel' ? (
            <>
              {selectedParty ? (
                <View style={styles.card}>
                  <Text style={styles.detailEyebrow}>{selectedParty.category}</Text>
                  <Text style={styles.detailTitle}>{selectedParty.name}</Text>
                  <Text style={styles.detailSubtitle}>{selectedParty.date} | {selectedParty.location}</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryValue}>{completedTasks}/{selectedParty.tasks.length}</Text>
                      <Text style={styles.summaryLabel}>Tarefas</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryValue}>{confirmedGuests}/{selectedParty.guests.length}</Text>
                      <Text style={styles.summaryLabel}>RSVP</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Etapas do projeto</Text>
                {roadmapStages.map((stage) => (
                  <View key={stage.id} style={styles.roadmapCard}>
                    <Text style={styles.roadmapStatus}>{stage.status}</Text>
                    <Text style={styles.roadmapTitle}>{stage.title}</Text>
                    <Text style={styles.roadmapDescription}>{stage.description}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {activeSection === 'Planejar' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Nova festa</Text>
                <TextInput placeholder="Nome da festa" placeholderTextColor="#7e776f" style={styles.input} value={partyForm.name} onChangeText={(value) => setPartyForm((current) => ({ ...current, name: value }))} />
                <TextInput placeholder="Categoria" placeholderTextColor="#7e776f" style={styles.input} value={partyForm.category} onChangeText={(value) => setPartyForm((current) => ({ ...current, category: value }))} />
                <TextInput placeholder="Data" placeholderTextColor="#7e776f" style={styles.input} value={partyForm.date} onChangeText={(value) => setPartyForm((current) => ({ ...current, date: value }))} />
                <TextInput placeholder="Local" placeholderTextColor="#7e776f" style={styles.input} value={partyForm.location} onChangeText={(value) => setPartyForm((current) => ({ ...current, location: value }))} />
                <TextInput placeholder="Orcamento previsto" placeholderTextColor="#7e776f" keyboardType="numeric" style={styles.input} value={partyForm.estimatedBudget} onChangeText={(value) => setPartyForm((current) => ({ ...current, estimatedBudget: value }))} />
                <Pressable style={styles.primaryButton} onPress={handleCreateParty}><Text style={styles.primaryButtonText}>{isSubmitting ? 'Salvando...' : 'Criar festa'}</Text></Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Adicionar tarefa</Text>
                <Text style={styles.formCaption}>Festa selecionada: {selectedParty?.name ?? 'Selecione ou crie uma festa'}</Text>
                <TextInput placeholder="Titulo da tarefa" placeholderTextColor="#7e776f" style={styles.input} value={taskForm.title} onChangeText={(value) => setTaskForm((current) => ({ ...current, title: value }))} />
                <TextInput placeholder="Responsavel" placeholderTextColor="#7e776f" style={styles.input} value={taskForm.assignee} onChangeText={(value) => setTaskForm((current) => ({ ...current, assignee: value }))} />
                <Pressable style={[styles.primaryButton, !selectedParty && styles.primaryButtonDisabled]} onPress={handleCreateTask} disabled={!selectedParty}><Text style={styles.primaryButtonText}>{isSubmitting ? 'Salvando...' : 'Salvar tarefa'}</Text></Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Adicionar convidado</Text>
                <TextInput placeholder="Nome do convidado" placeholderTextColor="#7e776f" style={styles.input} value={guestForm.name} onChangeText={(value) => setGuestForm((current) => ({ ...current, name: value }))} />
                <TextInput placeholder="Grupo" placeholderTextColor="#7e776f" style={styles.input} value={guestForm.group} onChangeText={(value) => setGuestForm((current) => ({ ...current, group: value }))} />
                <View style={styles.statusRow}>
                  {guestStatuses.map((status) => {
                    const isSelected = guestForm.status === status;
                    return (
                      <Pressable key={status} style={[styles.statusButton, isSelected && styles.statusButtonSelected]} onPress={() => setGuestForm((current) => ({ ...current, status }))}>
                        <Text style={[styles.statusButtonText, isSelected && styles.statusButtonTextSelected]}>{status}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={[styles.primaryButton, !selectedParty && styles.primaryButtonDisabled]} onPress={handleCreateGuest} disabled={!selectedParty}><Text style={styles.primaryButtonText}>{isSubmitting ? 'Salvando...' : 'Salvar convidado'}</Text></Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Adicionar despesa</Text>
                <TextInput placeholder="Descricao" placeholderTextColor="#7e776f" style={styles.input} value={budgetForm.label} onChangeText={(value) => setBudgetForm((current) => ({ ...current, label: value }))} />
                <TextInput placeholder="Categoria" placeholderTextColor="#7e776f" style={styles.input} value={budgetForm.category} onChangeText={(value) => setBudgetForm((current) => ({ ...current, category: value }))} />
                <TextInput placeholder="Valor" placeholderTextColor="#7e776f" keyboardType="numeric" style={styles.input} value={budgetForm.amount} onChangeText={(value) => setBudgetForm((current) => ({ ...current, amount: value }))} />
                <Pressable style={[styles.primaryButton, !selectedParty && styles.primaryButtonDisabled]} onPress={handleCreateBudgetItem} disabled={!selectedParty}><Text style={styles.primaryButtonText}>{isSubmitting ? 'Salvando...' : 'Salvar despesa'}</Text></Pressable>
              </View>
            </>
          ) : null}

          {activeSection === 'Operacao' && selectedParty ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Tarefas</Text>
                {selectedParty.tasks.map((task) => (
                  <Pressable key={task.id} style={styles.listItem} onPress={() => toggleTask(task.id)}>
                    <View style={[styles.statusDot, task.done ? styles.doneDot : styles.pendingDot]} />
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{task.title}</Text>
                      <Text style={styles.listSubtitle}>Responsavel: {task.assignee}</Text>
                    </View>
                    <Text style={styles.listBadge}>{task.done ? 'Feita' : 'Pendente'}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Convidados</Text>
                {selectedParty.guests.map((guest) => (
                  <View key={guest.id} style={styles.listItem}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{guest.name}</Text>
                      <Text style={styles.listSubtitle}>{guest.group}</Text>
                    </View>
                    <Text style={styles.listBadge}>{guest.status}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Financeiro</Text>
                <View style={styles.budgetHighlight}>
                  <Text style={styles.budgetLabel}>Gasto atual</Text>
                  <Text style={styles.budgetValue}>{currencyFormatter.format(selectedParty.budget.spent)}</Text>
                  <Text style={styles.budgetMeta}>Previsto: {currencyFormatter.format(selectedParty.budget.estimated)}</Text>
                  <Text style={styles.budgetMeta}>Uso do orcamento: {budgetProgress}%</Text>
                </View>
                {selectedParty.budget.items.map((item) => (
                  <View key={item.id} style={styles.listItem}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{item.label}</Text>
                      <Text style={styles.listSubtitle}>{item.category}</Text>
                    </View>
                    <Text style={styles.listBadge}>{currencyFormatter.format(item.amount)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {activeSection === 'Ajustes' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Preferencias</Text>
                <View style={styles.preferenceRow}>
                  <View style={styles.preferenceCopy}>
                    <Text style={styles.preferenceTitle}>Notificacoes informativas</Text>
                    <Text style={styles.preferenceDescription}>Exibe mensagens de login, logout e eventos importantes.</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={onNotificationsChange}
                    trackColor={{ false: '#d8d0c2', true: '#86c7a3' }}
                    thumbColor={notificationsEnabled ? '#1f3a5f' : '#f5efe6'}
                  />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Conta</Text>
                <Text style={styles.accountName}>{session.user.name}</Text>
                <Text style={styles.accountEmail}>{session.user.email}</Text>
                <Pressable style={styles.secondaryButton} onPress={onLogout}>
                  <Text style={styles.secondaryButtonText}>Sair da conta</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#efe7dc' },
  layout: { flex: 1 },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#18293e',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    zIndex: 1,
  },
  sidebarHeader: { paddingBottom: 18 },
  mainStage: {
    flex: 1,
    backgroundColor: '#efe7dc',
    zIndex: 2,
    shadowColor: '#0f1b2b',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  mainContent: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarLabel: { color: '#1f3a5f', fontSize: 15, fontWeight: '800' },
  hamburger: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerLines: { gap: 3, alignItems: 'center', justifyContent: 'center' },
  hamburgerLine: { width: 18, height: 2.5, borderRadius: 999, backgroundColor: '#1f3a5f' },
  brand: { color: '#f3d8a6', fontSize: 20, fontWeight: '800', paddingHorizontal: 4 },
  sidebarList: { gap: 10 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 12 },
  sidebarItemActive: { backgroundColor: '#ef7b45' },
  sidebarIcon: { color: '#d7dfeb', fontSize: 15, fontWeight: '800', width: 22, textAlign: 'center' },
  sidebarIconActive: { color: '#fffaf3' },
  sidebarLabel: { color: '#fffaf3', fontSize: 14, fontWeight: '800' },
  sidebarLabelActive: { color: '#fffaf3' },
  content: { padding: 20, gap: 20, paddingBottom: 30, minHeight: '100%' },
  heroCard: { backgroundColor: '#1f3a5f', borderRadius: 28, padding: 24, gap: 12 },
  overline: { color: '#f3d8a6', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: { color: '#fffaf3', fontSize: 30, fontWeight: '800', lineHeight: 36 },
  heroSubtitle: { color: '#dce6f4', fontSize: 15, lineHeight: 22 },
  apiHint: { color: '#f3d8a6', fontSize: 13 },
  accountHint: { color: '#dce6f4', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statPill: { flex: 1, backgroundColor: '#fffaf3', borderRadius: 22, padding: 14, gap: 4 },
  statValue: { color: '#1d2433', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#6e6a67', fontSize: 12 },
  card: { backgroundColor: '#fffaf3', borderRadius: 28, padding: 20, gap: 14 },
  errorCard: { backgroundColor: '#fff4ef', borderRadius: 24, padding: 18, gap: 6 },
  errorTitle: { color: '#af3e1d', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#7c4b3d', fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: '#1d2433', fontSize: 22, fontWeight: '800' },
  partyList: { gap: 12, paddingRight: 8 },
  partyCard: { width: 220, backgroundColor: '#fffaf3', borderRadius: 24, padding: 18, gap: 8 },
  partyCardSelected: { backgroundColor: '#ef7b45' },
  partyCardCategory: { color: '#ef7b45', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  partyCardTitle: { color: '#1d2433', fontSize: 20, fontWeight: '800' },
  partyCardMeta: { color: '#64605b', fontSize: 14 },
  partyCardSelectedText: { color: '#fffaf3' },
  detailEyebrow: { color: '#ef7b45', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  detailTitle: { color: '#1d2433', fontSize: 28, fontWeight: '800' },
  detailSubtitle: { color: '#6e6a67', fontSize: 15 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#f6efe6', borderRadius: 20, padding: 16, gap: 4 },
  summaryValue: { color: '#1d2433', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#6e6a67', fontSize: 13 },
  roadmapCard: { backgroundColor: '#f8f3ec', borderRadius: 20, padding: 16, gap: 6 },
  roadmapStatus: { color: '#ef7b45', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  roadmapTitle: { color: '#1d2433', fontSize: 18, fontWeight: '800' },
  roadmapDescription: { color: '#6e6a67', fontSize: 14, lineHeight: 20 },
  input: { backgroundColor: '#f8f3ec', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: '#1d2433', fontSize: 15 },
  primaryButton: { backgroundColor: '#ef7b45', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  primaryButtonText: { color: '#fffaf3', fontWeight: '800', fontSize: 15 },
  primaryButtonDisabled: { opacity: 0.5 },
  formCaption: { color: '#6e6a67', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusButton: { flex: 1, backgroundColor: '#f8f3ec', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statusButtonSelected: { backgroundColor: '#1f3a5f' },
  statusButtonText: { color: '#4d4b49', fontWeight: '700', fontSize: 12 },
  statusButtonTextSelected: { color: '#fffaf3' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f3ec', borderRadius: 20, padding: 14 },
  listCopy: { flex: 1, gap: 2 },
  listTitle: { color: '#1d2433', fontSize: 16, fontWeight: '700' },
  listSubtitle: { color: '#6e6a67', fontSize: 13 },
  listBadge: { color: '#1f3a5f', fontSize: 12, fontWeight: '700' },
  statusDot: { width: 12, height: 12, borderRadius: 999 },
  doneDot: { backgroundColor: '#3aa56d' },
  pendingDot: { backgroundColor: '#ef7b45' },
  budgetHighlight: { backgroundColor: '#1f3a5f', borderRadius: 24, padding: 18, gap: 4 },
  budgetLabel: { color: '#dce6f4', fontSize: 13 },
  budgetValue: { color: '#fffaf3', fontSize: 30, fontWeight: '800' },
  budgetMeta: { color: '#f3d8a6', fontSize: 14 },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preferenceCopy: { flex: 1, gap: 4 },
  preferenceTitle: { color: '#1d2433', fontSize: 16, fontWeight: '700' },
  preferenceDescription: { color: '#6e6a67', fontSize: 13, lineHeight: 18 },
  accountName: { color: '#1d2433', fontSize: 18, fontWeight: '800' },
  accountEmail: { color: '#6e6a67', fontSize: 14 },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#f3d8a6', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { color: '#1f3a5f', fontWeight: '800', fontSize: 14 },
});






