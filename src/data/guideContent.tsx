import React from 'react';
import { Flag, Navigation, Heart, Footprints, Zap, Users, Skull } from 'lucide-react';

/* ---------- Instructions ---------- */

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-white/80 font-semibold">{children}</strong>
);

const Gold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-[#c2a078] font-semibold">{children}</strong>
);

const Red: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-red-400 font-semibold">{children}</strong>
);

interface InstructionCard {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

// Keep in step with GameCanvas: updateAlphaLeader (steering, stamina, crowding, hop) and processCollisions (bites).
const INSTRUCTIONS: InstructionCard[] = [
  {
    icon: <Flag className="w-4 h-4" />,
    title: 'The crossing',
    body: (
      <>
        You are the lead wildebeest of a herd. Swim across the Mara from the left bank and climb out through one of the two{' '}
        <Gold>green exit ramps</Gold> on the far side. The rest of that bank is a mud cliff you can&rsquo;t climb.
        There are 10 crossings, and at each one you lead a new herd across a more dangerous stretch of river, with more crocodiles and a stronger current.
      </>
    ),
  },
  {
    icon: <Navigation className="w-4 h-4" />,
    title: 'Steering',
    body: (
      <>
        Use <Key>WASD</Key> or the <Key>arrow keys</Key>, or point with the mouse: your wildebeest swims towards
        wherever you <Key>move</Key>, <Key>click</Key> or <Key>tap</Key> on the screen. Once you point, the mouse
        overrides the keys until your wildebeest reaches that spot.
      </>
    ),
  },
  {
    icon: <Heart className="w-4 h-4" />,
    title: 'Health & stamina',
    body: (
      <>
        Swimming uses <Gold>stamina</Gold>, more when you head upstream and far more in a crush of animals, and it
        doesn&rsquo;t refill during a crossing. Run low and you become exhausted: slow, and unable to hop. At zero
        you start to drown. <Gold>Health</Gold> is lost to bites, trampling and drowning, and only recovers on the
        bank. Let the current carry you too far downstream and you&rsquo;re <Red>swept away</Red>.
      </>
    ),
  },
  {
    icon: <Footprints className="w-4 h-4" />,
    title: 'Stampedes',
    body: (
      <>
        When three or more animals press in around you, you&rsquo;re caught in a <Gold>stampede</Gold>: you slow
        down, get trampled (losing health) and tire quickly. Hop or steer out of the crush.
      </>
    ),
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'Hopping',
    body: (
      <>
        Press <Key>Space</Key> or the <Key>Hop!</Key> button to hop while in the water. Each hop costs{' '}
        <Red>15% stamina</Red>. It gives a short lunge forward and shoves nearby animals aside, breaking up a
        stampede. Time it well and you leap clear over a crocodile&rsquo;s jaws.
      </>
    ),
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: 'Stay with the herd',
    body: (
      <>
        There is safety in numbers. Stray too far from the others and you&rsquo;ll see an <Red>isolated</Red>{' '}
        warning: stalking crocodiles hunt lone swimmers and close in faster. Stay near the herd, but not in the
        crush.
      </>
    ),
  },
  {
    icon: <Skull className="w-4 h-4" />,
    title: 'Crocodiles',
    body: (
      <>
        Some crocodiles <Key>patrol</Key> back and forth, some <Key>stalk</Key> strays, and some <Key>lie still</Key>{' '}
        until they wake. Wide-open jaws mean they&rsquo;re ready to strike. A bite hurts and knocks you back, and a
        few bites are fatal. A crocodile that makes a kill has eaten, and ignores the herd for the rest of the crossing.
      </>
    ),
  },
];

export const InstructionsContent: React.FC = () => (
  <div className="space-y-3 text-xs leading-relaxed font-sans">
    {INSTRUCTIONS.map((card) => (
      <div key={card.title} className="bg-panel-raised p-4 rounded-xl border border-line flex gap-3">
        <div className="p-2 rounded-lg bg-panel text-[#c2a078] h-fit">{card.icon}</div>
        <div>
          <h4 className="font-display font-semibold text-[#c2a078] mb-1 text-sm">{card.title}</h4>
          <p className="text-white/65 leading-normal">{card.body}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- About ---------- */

const ABOUT_PARAGRAPHS: React.ReactNode[] = [
  <>
    Cross is a collaboration between Nature Venture and Internet of Elephants.
    <br />
    Developed by Gautam Shah.
  </>,
  <>
    This was my first attempt at vibe coding a game and where I started to explore what was possible and what are the
    current limitations. Nature has millions of story lines that play out every day, and one of the most dramatic is the
    annual crossing of wildebeest across the Mara River in search of grazing land. This has been documented thousands of
    times on film, both long and short, but every part of it seemed perfect for a short game that tried to simulate the
    manic energy that surrounds it, and the very real dangers that lurk.
  </>,
  <>
    While the idea was mine, the game was built entirely by AI. Of course, there are many things we would love to have had
    the help of a biologist, an illustrator, a creative director, and a game developer to get exactly right.
  </>,
  <>
    What&rsquo;s exciting is that we didn&rsquo;t need a whole team of people to get started. We had an idea, some
    curiosity, a couple of computers and a self-imposed timeline of less than a week. So that&rsquo;s what we did. And
    we&rsquo;re pretty excited about what else we might be able to make this way.
  </>,
];

export const AboutContent: React.FC = () => (
  <div className="space-y-3 text-xs leading-relaxed font-sans">
    {ABOUT_PARAGRAPHS.map((para, i) => (
      <p key={i} className="text-white/65 leading-normal px-1">{para}</p>
    ))}
  </div>
);

/* ---------- References ---------- */

export const ReferencesContent: React.FC = () => null;
