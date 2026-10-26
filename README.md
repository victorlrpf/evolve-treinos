# Evolve Treinos

App em React Native (Expo + TypeScript) para criar treinos e acompanhar a evolução com relatórios e dashboard. Funciona offline: treinos, exercícios, histórico e preferências são persistidos localmente em SQLite, sem servidor.

## Como rodar

```bash
npm install
npx expo start
```

Abra no celular com o app **Expo Go** (QR code) ou pressione `a` (Android) / `i` (iOS) para usar um emulador.

Os dados ficam no banco SQLite local. Na primeira abertura após esta atualização, os dados existentes em AsyncStorage são importados automaticamente e removidos do armazenamento antigo após a importação bem-sucedida. A sincronização com Supabase ainda não faz parte desta etapa.

## Telas

| Tela | Rota | O que faz |
| --- | --- | --- |
| Cadastro / boas-vindas | `/welcome` | Nome opcional para o app te chamar pelo nome. Dá para pular. |
| Dashboard | `/` | Treinos e volume dos últimos 7 dias, sequência de dias, gráficos e histórico. |
| Meus treinos | `/workouts` | Lista de treinos, com destaque para o treino do dia da semana. |
| Inclusão de treino | `/workout/form` | Nome, dia da semana, lembrete opcional, observações e exercícios (séries, reps, carga). |
| Edição de treino | `/workout/form?id=...` | Mesma tela, preenchida; permite editar o lembrete e excluir. |
| Visualização de treino | `/workout/[id]` | Detalhes, modo "Iniciar treino" (marcar exercícios) e evolução do treino. |
| Perfil | `/profile` | Lembrete personalizado por dias, horário e mensagem; nome, tema, trocar usuário e apagar dados. |

Os lembretes são notificações locais recorrentes, funcionam sem internet e pedem permissão na primeira ativação. Estão disponíveis no Android e iOS; o aparelho precisa permitir notificações para exibi-las. Se o Expo Go apresentar `ExpoTopicSubscriptionModule` ausente, atualize o Expo Go para uma versão compatível com o SDK do projeto ou teste com um development build.

## Como a evolução é calculada

Ao tocar em **Iniciar treino** e depois **Finalizar treino**, o app registra uma sessão com os exercícios marcados. O **volume** é a soma de `séries × repetições × carga (kg)`. O dashboard usa essas sessões para montar os gráficos (treinos por dia, volume por semana) e a sequência de dias.

## Estrutura

```
src/
  app/          rotas (Expo Router): _layout, welcome, (tabs), workout
  screens/      conteúdo de cada tela
  components/   Card, Button, Input, Chip, BarChart...
  store/        estado global, repositórios e banco SQLite local
  theme/        paleta roxa (clara e escura) e hook useTheme
  utils/        datas, volume, estatísticas do dashboard
```

## Tema

A cor principal é roxa (`src/theme/colors.ts`). O modo noturno é escolhido no Perfil (Claro, Noturno ou Automático, que segue o sistema).

## Ideias para evoluir

- Sincronização autenticada com Supabase e migração de dados de visitante
- Exportar / importar backup dos dados em JSON
- Cronômetro de descanso entre séries
- Gráfico de carga por exercício ao longo do tempo
- Notificações lembrando o treino do dia
