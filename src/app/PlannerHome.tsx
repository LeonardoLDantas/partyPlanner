import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
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
import { notificationsApi } from '../services/notificationsApi';
import { partyApi } from '../services/partyApi';
import { AppNotification, AuthSession, GuestStatus, Party } from '../types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const guestStatuses: GuestStatus[] = ['Confirmado', 'Pendente', 'Recusou'];
const topBarOffset = 76;

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;

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
    async function loadNotifications() {
      try {
        const remoteNotifications = await notificationsApi.getAll();
        setNotifications(remoteNotifications);
      } catch {
        // Ignore notification feed issues so the main planner stays usable.
      }
    }

    loadNotifications();
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

  async function refreshNotifications() {
    try {
      const remoteNotifications = await notificationsApi.getAll();
      setNotifications(remoteNotifications);
    } catch {
      // Ignore notification refresh failures after mutations.
    }
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
      await refreshNotifications();
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
      await refreshNotifications();
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
      await refreshNotifications();
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
      await refreshNotifications();
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
      await refreshNotifications();
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

  const sidebarWidth = Math.min(228, width * 0.64);

  const sidebarTranslateX = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });

  const contentTranslateX = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sidebarWidth],
  });

  async function handleNotificationPress() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen && unreadNotifications > 0) {
      await notificationsApi.markAllAsRead().catch(() => null);
      await refreshNotifications();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.layout}>
        <Animated.View
          pointerEvents={menuOpen ? 'auto' : 'none'}
          style={[styles.backdrop, { left: sidebarWidth, opacity: menuAnimation }]}
        >
          <Pressable style={styles.backdropTouch} onPress={() => setMenuOpen(false)} />
        </Animated.View>

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
            <Pressable
              style={styles.sidebarHamburger}
              onPress={() => setMenuOpen(false)}
            >
              <View style={styles.sidebarHamburgerLines}>
                <View style={styles.sidebarHamburgerLine} />
                <View style={styles.sidebarHamburgerLine} />
                <View style={styles.sidebarHamburgerLine} />
              </View>
            </Pressable>
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

          <View style={styles.sidebarFooter}>
            <Pressable style={styles.sidebarLogoutButton} onPress={onLogout}>
              <Text style={styles.sidebarLogoutLabel}>Sair da conta</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.mainStage,
            styles.mainStageOpen,
            { transform: [{ translateX: contentTranslateX }] },
          ]}
        >
          {notificationsOpen ? (
            <Pressable
              style={styles.notificationsBackdrop}
              onPress={() => setNotificationsOpen(false)}
            />
          ) : null}
          <View style={styles.topBar}>
            {!menuOpen ? (
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
            ) : (
              <View style={styles.hamburgerPlaceholder} />
            )}
            <Text style={styles.topBarLabel}>{activeSection}</Text>
            <Pressable style={styles.bellButton} onPress={handleNotificationPress}>
              <Feather name="bell" size={20} color="#27476f" />
              {unreadNotifications > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{Math.min(unreadNotifications, 9)}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          {notificationsOpen ? (
            <View style={styles.notificationsPanel}>
              <View style={styles.notificationsHeader}>
                <Text style={styles.notificationsTitle}>Notificacoes</Text>
                <Text style={styles.notificationsMeta}>{notifications.length} itens</Text>
              </View>
              <ScrollView
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <View key={notification.id} style={styles.notificationCard}>
                      <Text style={styles.notificationCardTitle}>{notification.title}</Text>
                      <Text style={styles.notificationCardMessage}>{notification.message}</Text>
                      <Text style={styles.notificationCardMeta}>
                        {new Date(notification.createdAtUtc).toLocaleString('pt-BR')}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.notificationEmpty}>
                    <Text style={styles.notificationEmptyText}>Nenhuma notificacao ainda.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : null}
          <ScrollView style={styles.mainContent} contentContainerStyle={styles.content}>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    top: topBarOffset,
    backgroundColor: 'rgba(15, 27, 43, 0.12)',
    zIndex: 3,
  },
  backdropTouch: { flex: 1 },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(24, 41, 62, 0.92)',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    zIndex: 4,
  },
  sidebarHeader: {
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainStage: {
    flex: 1,
    backgroundColor: '#efe7dc',
    zIndex: 2,
  },
  mainStageOpen: { zIndex: 2 },
  mainContent: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarLabel: { color: '#1f3a5f', fontSize: 15, fontWeight: '800' },
  bellButton: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#ef7b45',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: '#fffaf3', fontSize: 10, fontWeight: '800' },
  notificationsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    top: topBarOffset,
    zIndex: 5,
  },
  notificationsPanel: {
    position: 'absolute',
    top: topBarOffset + 6,
    right: 20,
    width: 320,
    maxWidth: '84%',
    maxHeight: 360,
    backgroundColor: '#fffaf3',
    borderRadius: 24,
    padding: 18,
    zIndex: 6,
    borderWidth: 1,
    borderColor: '#eadfce',
    shadowColor: '#122033',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notificationsTitle: { color: '#1d2433', fontSize: 18, fontWeight: '800' },
  notificationsMeta: { color: '#6e6a67', fontSize: 12, fontWeight: '700' },
  notificationsList: { maxHeight: 300 },
  notificationCard: {
    backgroundColor: '#f8f3ec',
    borderRadius: 18,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  notificationCardTitle: { color: '#1d2433', fontSize: 14, fontWeight: '800' },
  notificationCardMessage: { color: '#4d4b49', fontSize: 13, lineHeight: 19 },
  notificationCardMeta: { color: '#8a8378', fontSize: 11, fontWeight: '700' },
  notificationEmpty: {
    backgroundColor: '#f8f3ec',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationEmptyText: { color: '#6e6a67', fontSize: 13, fontWeight: '700' },
  hamburger: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerPlaceholder: { width: 20 },
  hamburgerLines: { gap: 3, alignItems: 'center', justifyContent: 'center' },
  hamburgerLine: { width: 18, height: 2.5, borderRadius: 999, backgroundColor: '#1f3a5f' },
  sidebarHamburger: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 250, 243, 0.08)',
  },
  sidebarHamburgerLines: { gap: 3, alignItems: 'center', justifyContent: 'center' },
  sidebarHamburgerLine: {
    width: 16,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: '#fffaf3',
  },
  brand: { color: '#f3d8a6', fontSize: 20, fontWeight: '800', paddingHorizontal: 4 },
  sidebarList: { gap: 10 },
  sidebarFooter: { marginTop: 'auto', paddingTop: 20 },
  sidebarLogoutButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(243, 216, 166, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(243, 216, 166, 0.28)',
  },
  sidebarLogoutLabel: {
    color: '#f3d8a6',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 12 },
  sidebarItemActive: { backgroundColor: '#ef7b45' },
  sidebarIcon: { color: '#d7dfeb', fontSize: 15, fontWeight: '800', width: 22, textAlign: 'center' },
  sidebarIconActive: { color: '#fffaf3' },
  sidebarLabel: { color: '#fffaf3', fontSize: 14, fontWeight: '800' },
  sidebarLabelActive: { color: '#fffaf3' },
  content: { padding: 20, paddingTop: topBarOffset, gap: 20, paddingBottom: 30, minHeight: '100%' },
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






