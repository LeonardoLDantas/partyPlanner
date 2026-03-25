import { Party } from '../types';

export const parties: Party[] = [
  {
    id: 'party-1',
    name: 'Aniversario da Sofia',
    category: 'Aniversario',
    date: '12 de abril de 2026',
    location: 'Espaco Jardim Azul',
    tasks: [
      {
        id: 'task-1',
        title: 'Fechar buffet infantil',
        assignee: 'Luiza',
        done: true,
      },
      {
        id: 'task-2',
        title: 'Confirmar decoracao tema sereia',
        assignee: 'Marina',
        done: false,
      },
      {
        id: 'task-3',
        title: 'Enviar lembrete aos convidados',
        assignee: 'Carlos',
        done: false,
      },
    ],
    guests: [
      {
        id: 'guest-1',
        name: 'Ana e familia',
        group: 'Familia',
        status: 'Confirmado',
      },
      {
        id: 'guest-2',
        name: 'Escola Arco-Iris',
        group: 'Amigos da escola',
        status: 'Pendente',
      },
      {
        id: 'guest-3',
        name: 'Tia Cintia',
        group: 'Familia',
        status: 'Confirmado',
      },
    ],
    budget: {
      estimated: 8500,
      spent: 5200,
      items: [
        {
          id: 'budget-1',
          label: 'Buffet',
          category: 'Alimentacao',
          amount: 2800,
        },
        {
          id: 'budget-2',
          label: 'Decoracao',
          category: 'Ambiente',
          amount: 1450,
        },
        {
          id: 'budget-3',
          label: 'Convites',
          category: 'Papelaria',
          amount: 950,
        },
      ],
    },
  },
  {
    id: 'party-2',
    name: 'Cha Bar do Rafa e da Bia',
    category: 'Cha Bar',
    date: '30 de maio de 2026',
    location: 'Cobertura Vila Serena',
    tasks: [
      {
        id: 'task-4',
        title: 'Definir lista de bebidas',
        assignee: 'Rafa',
        done: true,
      },
      {
        id: 'task-5',
        title: 'Reservar DJ',
        assignee: 'Bia',
        done: true,
      },
      {
        id: 'task-6',
        title: 'Criar lista de presentes',
        assignee: 'Patricia',
        done: false,
      },
    ],
    guests: [
      {
        id: 'guest-4',
        name: 'Bruno',
        group: 'Amigos',
        status: 'Confirmado',
      },
      {
        id: 'guest-5',
        name: 'Fernanda',
        group: 'Trabalho',
        status: 'Confirmado',
      },
      {
        id: 'guest-6',
        name: 'Casal Pereira',
        group: 'Familia',
        status: 'Pendente',
      },
    ],
    budget: {
      estimated: 12000,
      spent: 6700,
      items: [
        {
          id: 'budget-4',
          label: 'Open bar',
          category: 'Bebidas',
          amount: 3200,
        },
        {
          id: 'budget-5',
          label: 'DJ',
          category: 'Entretenimento',
          amount: 1800,
        },
        {
          id: 'budget-6',
          label: 'Finger foods',
          category: 'Alimentacao',
          amount: 1700,
        },
      ],
    },
  },
];
