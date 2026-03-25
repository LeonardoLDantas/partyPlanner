import { RoadmapStage } from '../types';

export const roadmapStages: RoadmapStage[] = [
  {
    id: 'stage-1',
    title: 'Base mobile reutilizavel',
    description: 'Expo, React Native e TypeScript para manter Android e iOS na mesma base.',
    status: 'Concluida',
  },
  {
    id: 'stage-2',
    title: 'Gestao local de festas',
    description: 'Cadastro local de festas, tarefas, convidados e despesas para validar o produto.',
    status: 'Em andamento',
  },
  {
    id: 'stage-3',
    title: 'Backend .NET',
    description: 'API REST para persistencia, integracao mobile e evolucao para multiusuario.',
    status: 'Em andamento',
  },
  {
    id: 'stage-4',
    title: 'Escala e colaboracao',
    description: 'Login, compartilhamento de eventos, notificacoes e deploy.',
    status: 'Planejada',
  },
];
