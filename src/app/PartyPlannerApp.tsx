import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { roadmapStages } from '../constants/roadmap';
import { apiBaseUrl } from '../config/api';
import { partyApi } from '../services/partyApi';
import { GuestStatus, Party } from '../types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const guestStatuses: GuestStatus[] = ['Confirmado', 'Pendente', 'Recusou'];

type PlannerTab = 'Resumo' | 'Cadastros';

type PartyForm = {
  name: string;
  category: string;
  date: string;
  location: string;
  estimatedBudget: string;
};

type TaskForm = {
  title: string;
  assignee: string;
};

type GuestForm = {
  name: string;
  group: string;
  status: GuestStatus;
};

type BudgetForm = {
  label: string;
  category: string;
  amount: string;
};

const emptyPartyForm: PartyForm = {
  name: '',
  category: '',
  date: '',
  location: '',
  estimatedBudget: '',
};

const emptyTaskForm: TaskForm = {
  title: '',
  assignee: '',
};

const emptyGuestForm: GuestForm = {
  name: '',
  group: '',
  status: 'Pendente',
};

const emptyBudgetForm: BudgetForm = {
  label: '',
  category: '',
  amount: '',
};

export function PartyPlannerApp() {
  const [activeTab, setActiveTab] = useState<PlannerTab>('Resumo');
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
    (count, party) =>
      count + party.guests.filter((guest) => guest.status === 'Confirmado').length,
    0
  );

  const globalBudget = parties.reduce((sum, party) => sum + party.budget.spent, 0);

  useEffect(() => {
    async function loadParties() {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const remoteParties = await partyApi.getParties();
        setParties(remoteParties);
        setSelectedPartyId((current) => current || remoteParties[0]?.id || '');
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Nao foi possivel carregar a API.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadParties();
  }, []);

  function syncParty(updatedParty: Party) {
    setParties((currentParties) => {
      const exists = currentParties.some((party) => party.id === updatedParty.id);
      if (!exists) {
        return [updatedParty, ...currentParties];
      }

      return currentParties.map((party) =>
        party.id === updatedParty.id ? updatedParty : party
      );
    });
    setSelectedPartyId(updatedParty.id);
  }

  async function handleCreateParty() {
    if (!partyForm.name.trim()) {
      return;
    }

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
      setActiveTab('Resumo');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a festa.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateTask() {
    if (!selectedParty || !taskForm.title.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const updatedParty = await partyApi.createTask(selectedParty.id, {
        title: taskForm.title.trim(),
        assignee: taskForm.assignee.trim(),
      });
      syncParty(updatedParty);
      setTaskForm(emptyTaskForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a tarefa.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateGuest() {
    if (!selectedParty || !guestForm.name.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const updatedParty = await partyApi.createGuest(selectedParty.id, {
        name: guestForm.name.trim(),
        group: guestForm.group.trim(),
        status: guestForm.status,
      });
      syncParty(updatedParty);
      setGuestForm(emptyGuestForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar o convidado.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateBudgetItem() {
    if (!selectedParty || !budgetForm.label.trim()) {
      return;
    }

    const amount = Number(budgetForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const updatedParty = await partyApi.createBudgetItem(selectedParty.id, {
        label: budgetForm.label.trim(),
        category: budgetForm.category.trim(),
        amount,
      });
      syncParty(updatedParty);
      setBudgetForm(emptyBudgetForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar a despesa.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleTask(taskId: string) {
    if (!selectedParty) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const updatedParty = await partyApi.toggleTask(selectedParty.id, taskId);
      syncParty(updatedParty);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar a tarefa.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const completedTasks = selectedParty?.tasks.filter((task) => task.done).length ?? 0;
  const confirmedGuests =
    selectedParty?.guests.filter((guest) => guest.status === 'Confirmado').length ?? 0;
  const budgetProgress =
    selectedParty && selectedParty.budget.estimated > 0
      ? Math.round((selectedParty.budget.spent / selectedParty.budget.estimated) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.overline}>Party Planner</Text>
          <Text style={styles.heroTitle}>Planejamento de festas em etapas</Text>
          <Text style={styles.heroSubtitle}>
            Base cross-platform para Android e iOS, com cadastro local agora e API
            .NET pronta para virar persistencia real.
          </Text>
          <Text style={styles.apiHint}>API: {apiBaseUrl}</Text>

          <View style={styles.heroStats}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{parties.length}</Text>
              <Text style={styles.statLabel}>Festas ativas</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{globalConfirmedGuests}</Text>
              <Text style={styles.statLabel}>Confirmados</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>
                {currencyFormatter.format(globalBudget)}
              </Text>
              <Text style={styles.statLabel}>Total lancado</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Etapas do projeto</Text>
          <View style={styles.roadmapList}>
            {roadmapStages.map((stage) => (
              <View key={stage.id} style={styles.roadmapCard}>
                <Text style={styles.roadmapStatus}>{stage.status}</Text>
                <Text style={styles.roadmapTitle}>{stage.title}</Text>
                <Text style={styles.roadmapDescription}>{stage.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1f3a5f" />
            <Text style={styles.loadingText}>Carregando festas da API...</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha de integracao</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!selectedParty && !isLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nenhuma festa encontrada</Text>
            <Text style={styles.sectionHint}>
              Crie a primeira festa pela aba Cadastros para popular a API.
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Minhas festas</Text>
          <Text style={styles.sectionHint}>
            Selecione uma festa para acompanhar ou edite os dados na aba Cadastros
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.partyList}
        >
          {parties.map((party) => {
            const isSelected = party.id === selectedParty.id;

            return (
              <Pressable
                key={party.id}
                style={[styles.partyCard, isSelected && styles.partyCardSelected]}
                onPress={() => setSelectedPartyId(party.id)}
              >
                <Text
                  style={[
                    styles.partyCardCategory,
                    isSelected && styles.partyCardCategorySelected,
                  ]}
                >
                  {party.category}
                </Text>
                <Text
                  style={[
                    styles.partyCardTitle,
                    isSelected && styles.partyCardTitleSelected,
                  ]}
                >
                  {party.name}
                </Text>
                <Text
                  style={[
                    styles.partyCardMeta,
                    isSelected && styles.partyCardMetaSelected,
                  ]}
                >
                  {party.date}
                </Text>
                <Text
                  style={[
                    styles.partyCardMeta,
                    isSelected && styles.partyCardMetaSelected,
                  ]}
                >
                  {party.location}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.tabRow}>
          {(['Resumo', 'Cadastros'] as PlannerTab[]).map((tab) => {
            const isActive = tab === activeTab;

            return (
              <Pressable
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'Resumo' && selectedParty ? (
          <>
            <View style={styles.detailCard}>
              <Text style={styles.detailEyebrow}>{selectedParty.category}</Text>
              <Text style={styles.detailTitle}>{selectedParty.name}</Text>
              <Text style={styles.detailSubtitle}>
                {selectedParty.date} | {selectedParty.location}
              </Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>
                    {completedTasks}/{selectedParty.tasks.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Tarefas concluidas</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>
                    {confirmedGuests}/{selectedParty.guests.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Convidados confirmados</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarefas</Text>
              {selectedParty.tasks.map((task) => (
                <Pressable
                  key={task.id}
                  style={styles.listItem}
                  onPress={() => toggleTask(task.id)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      task.done ? styles.doneDot : styles.pendingDot,
                    ]}
                  />
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{task.title}</Text>
                    <Text style={styles.listSubtitle}>
                      Responsavel: {task.assignee}
                    </Text>
                  </View>
                  <Text style={styles.listBadge}>
                    {task.done ? 'Feita' : 'Pendente'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financeiro</Text>
              <View style={styles.budgetHighlight}>
                <Text style={styles.budgetLabel}>Gasto atual</Text>
                <Text style={styles.budgetValue}>
                  {currencyFormatter.format(selectedParty.budget.spent)}
                </Text>
                <Text style={styles.budgetMeta}>
                  Previsto: {currencyFormatter.format(selectedParty.budget.estimated)}
                </Text>
                <Text style={styles.budgetMeta}>Uso do orcamento: {budgetProgress}%</Text>
              </View>

              {selectedParty.budget.items.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{item.label}</Text>
                    <Text style={styles.listSubtitle}>{item.category}</Text>
                  </View>
                  <Text style={styles.listBadge}>
                    {currencyFormatter.format(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nova festa</Text>
              <TextInput
                placeholder="Nome da festa"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={partyForm.name}
                onChangeText={(value) => setPartyForm((current) => ({ ...current, name: value }))}
              />
              <TextInput
                placeholder="Categoria"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={partyForm.category}
                onChangeText={(value) =>
                  setPartyForm((current) => ({ ...current, category: value }))
                }
              />
              <TextInput
                placeholder="Data"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={partyForm.date}
                onChangeText={(value) => setPartyForm((current) => ({ ...current, date: value }))}
              />
              <TextInput
                placeholder="Local"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={partyForm.location}
                onChangeText={(value) =>
                  setPartyForm((current) => ({ ...current, location: value }))
                }
              />
              <TextInput
                placeholder="Orcamento previsto"
                placeholderTextColor="#7e776f"
                keyboardType="numeric"
                style={styles.input}
                value={partyForm.estimatedBudget}
                onChangeText={(value) =>
                  setPartyForm((current) => ({ ...current, estimatedBudget: value }))
                }
              />
              <Pressable style={styles.primaryButton} onPress={handleCreateParty}>
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Salvando...' : 'Criar festa'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adicionar tarefa</Text>
              <Text style={styles.formCaption}>
                Festa selecionada: {selectedParty?.name ?? 'Selecione ou crie uma festa'}
              </Text>
              <TextInput
                placeholder="Titulo da tarefa"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={taskForm.title}
                onChangeText={(value) => setTaskForm((current) => ({ ...current, title: value }))}
              />
              <TextInput
                placeholder="Responsavel"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={taskForm.assignee}
                onChangeText={(value) =>
                  setTaskForm((current) => ({ ...current, assignee: value }))
                }
              />
              <Pressable
                style={[
                  styles.primaryButton,
                  !selectedParty && styles.primaryButtonDisabled,
                ]}
                onPress={handleCreateTask}
                disabled={!selectedParty}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Salvando...' : 'Salvar tarefa'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adicionar convidado</Text>
              <TextInput
                placeholder="Nome do convidado"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={guestForm.name}
                onChangeText={(value) => setGuestForm((current) => ({ ...current, name: value }))}
              />
              <TextInput
                placeholder="Grupo"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={guestForm.group}
                onChangeText={(value) => setGuestForm((current) => ({ ...current, group: value }))}
              />
              <View style={styles.statusRow}>
                {guestStatuses.map((status) => {
                  const isSelected = guestForm.status === status;

                  return (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusButton,
                        isSelected && styles.statusButtonSelected,
                      ]}
                      onPress={() =>
                        setGuestForm((current) => ({ ...current, status }))
                      }
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          isSelected && styles.statusButtonTextSelected,
                        ]}
                      >
                        {status}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                style={[
                  styles.primaryButton,
                  !selectedParty && styles.primaryButtonDisabled,
                ]}
                onPress={handleCreateGuest}
                disabled={!selectedParty}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Salvando...' : 'Salvar convidado'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adicionar despesa</Text>
              <TextInput
                placeholder="Descricao"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={budgetForm.label}
                onChangeText={(value) =>
                  setBudgetForm((current) => ({ ...current, label: value }))
                }
              />
              <TextInput
                placeholder="Categoria"
                placeholderTextColor="#7e776f"
                style={styles.input}
                value={budgetForm.category}
                onChangeText={(value) =>
                  setBudgetForm((current) => ({ ...current, category: value }))
                }
              />
              <TextInput
                placeholder="Valor"
                placeholderTextColor="#7e776f"
                keyboardType="numeric"
                style={styles.input}
                value={budgetForm.amount}
                onChangeText={(value) =>
                  setBudgetForm((current) => ({ ...current, amount: value }))
                }
              />
              <Pressable
                style={[
                  styles.primaryButton,
                  !selectedParty && styles.primaryButtonDisabled,
                ]}
                onPress={handleCreateBudgetItem}
                disabled={!selectedParty}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Salvando...' : 'Salvar despesa'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6efe6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#1f3a5f',
    borderRadius: 28,
    padding: 24,
    gap: 16,
  },
  overline: {
    color: '#f3d8a6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fffaf3',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroSubtitle: {
    color: '#dce6f4',
    fontSize: 15,
    lineHeight: 22,
  },
  heroStats: {
    gap: 10,
  },
  apiHint: {
    color: '#f3d8a6',
    fontSize: 13,
  },
  statPill: {
    backgroundColor: '#2d4d77',
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  statValue: {
    color: '#fffaf3',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#dce6f4',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#fffaf3',
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: '#1d2433',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#6e6a67',
    fontSize: 14,
    lineHeight: 20,
  },
  roadmapList: {
    gap: 12,
  },
  roadmapCard: {
    backgroundColor: '#f8f3ec',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  roadmapStatus: {
    color: '#ef7b45',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roadmapTitle: {
    color: '#1d2433',
    fontSize: 18,
    fontWeight: '800',
  },
  roadmapDescription: {
    color: '#6e6a67',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingCard: {
    backgroundColor: '#fffaf3',
    borderRadius: 28,
    padding: 24,
    gap: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6e6a67',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#fff4ef',
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  errorTitle: {
    color: '#af3e1d',
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: '#7c4b3d',
    fontSize: 14,
    lineHeight: 20,
  },
  partyList: {
    gap: 12,
    paddingRight: 8,
  },
  partyCard: {
    width: 220,
    backgroundColor: '#fffaf3',
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  partyCardSelected: {
    backgroundColor: '#ef7b45',
  },
  partyCardCategory: {
    color: '#ef7b45',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  partyCardCategorySelected: {
    color: '#fff0dd',
  },
  partyCardTitle: {
    color: '#1d2433',
    fontSize: 20,
    fontWeight: '800',
  },
  partyCardTitleSelected: {
    color: '#ffffff',
  },
  partyCardMeta: {
    color: '#64605b',
    fontSize: 14,
  },
  partyCardMetaSelected: {
    color: '#fff0dd',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#e8dfd1',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1f3a5f',
  },
  tabText: {
    color: '#4d4b49',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fffaf3',
  },
  detailCard: {
    backgroundColor: '#fffaf3',
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  detailEyebrow: {
    color: '#ef7b45',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailTitle: {
    color: '#1d2433',
    fontSize: 28,
    fontWeight: '800',
  },
  detailSubtitle: {
    color: '#6e6a67',
    fontSize: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f6efe6',
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  summaryValue: {
    color: '#1d2433',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#6e6a67',
    fontSize: 13,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8f3ec',
    borderRadius: 20,
    padding: 14,
  },
  listCopy: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    color: '#1d2433',
    fontSize: 16,
    fontWeight: '700',
  },
  listSubtitle: {
    color: '#6e6a67',
    fontSize: 13,
  },
  listBadge: {
    color: '#1f3a5f',
    fontSize: 12,
    fontWeight: '700',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  doneDot: {
    backgroundColor: '#3aa56d',
  },
  pendingDot: {
    backgroundColor: '#ef7b45',
  },
  budgetHighlight: {
    backgroundColor: '#1f3a5f',
    borderRadius: 24,
    padding: 18,
    gap: 4,
  },
  budgetLabel: {
    color: '#dce6f4',
    fontSize: 13,
  },
  budgetValue: {
    color: '#fffaf3',
    fontSize: 30,
    fontWeight: '800',
  },
  budgetMeta: {
    color: '#f3d8a6',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#f8f3ec',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1d2433',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#ef7b45',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fffaf3',
    fontWeight: '800',
    fontSize: 15,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  formCaption: {
    color: '#6e6a67',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#f8f3ec',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusButtonSelected: {
    backgroundColor: '#1f3a5f',
  },
  statusButtonText: {
    color: '#4d4b49',
    fontWeight: '700',
    fontSize: 12,
  },
  statusButtonTextSelected: {
    color: '#fffaf3',
  },
});
