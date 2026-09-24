// Field notes shown on the between-crossings screen, keyed by the crossing about to be played.
// Crossing 1 has none: the start screen's intro text covers it.
export interface FieldNote {
  headline: string;
  body: string;
}

export const FIELD_NOTES: Record<number, FieldNote> = {
  2: {
    headline: 'There’s no leader of a wildebeest herd.',
    body: 'Nobody is in charge of this enormous journey. Each wildebeest responds to rain, grass and the animals around it—and somehow, millions move together.',
  },
  3: {
    headline: 'It’s one giant loop.',
    body: 'The migration doesn’t really have a beginning or an end. Wildebeest spend the year moving in a roughly circular route, constantly chasing the freshest grass.',
  },
  4: {
    headline: 'One animal can start a stampede.',
    body: 'A herd may wait at a river for hours—or even days. Then one wildebeest takes the plunge, and suddenly thousands can follow.',
  },
  5: {
    headline: 'Follow the rain, find the food.',
    body: 'Wildebeest aren’t wandering randomly. They track the rains across the Serengeti, following the explosion of fresh, nutritious grass that comes afterward.',
  },
  6: {
    headline: 'It’s a seriously crowded road.',
    body: 'Around 1.2–1.5 million wildebeest make the journey, joined by hundreds of thousands of zebra and gazelle. That’s a lot of hooves on the move.',
  },
  7: {
    headline: 'Even death feeds the migration.',
    body: 'A river crossing can leave thousands of carcasses behind. Those dead wildebeest aren’t wasted—they dump huge amounts of nutrients into the river, feeding fish, insects and other wildlife.',
  },
  8: {
    headline: 'The crocodiles don’t need to eat every day.',
    body: 'With an incredibly slow metabolism, Nile crocodiles can go long periods between meals. The annual wildebeest migration brings them a seasonal feast—but surprisingly, they eat only a small fraction of the animals that die in the river.',
  },
  9: {
    headline: 'Zebras and wildebeest make a good team.',
    body: 'Zebras like taller, tougher grasses. Wildebeest prefer the shorter, fresher stuff. By traveling together, they can make the most of the same grassland.',
  },
  10: {
    headline: 'One herd can reshape an ecosystem.',
    body: 'Millions of hooves, tonnes of dung and thousands of carcasses leave a mark. The migration doesn’t just move through the Serengeti—it helps shape the entire ecosystem around it.',
  },
};
