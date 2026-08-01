import { distinctEkadashis, ekadashiSlug } from "@/lib/vaishnava-calendar";

// The māhātmya of each ekādaśī - the story Kṛṣṇa tells Yudhiṣṭhira (or
// Brahmā tells Nārada) explaining why THIS day, of the twenty-four, carries
// the mercy it does. /calendar knew the dates and nothing else; a devotee who
// tapped "Pāśāṅkuśā Ekādaśī" landed on /topic/ekadashi, the same undifferen-
// tiated pile of 278 videos every other ekādaśī also pointed at.
//
// WHOSE WORDS THESE ARE. The stories are Purāṇic - Padma, Brahma-vaivarta and
// Bhaviṣya - and therefore nobody's property; the RETELLINGS circulating on
// devotional sites are those sites' own copyrighted prose. So every caption
// below is written fresh from the Purāṇic account, each story names the
// Purāṇa it comes from, and ISKCON Desire Tree is credited and LINKED rather
// than copied. "Index, never host" is not a rule about video files - it is
// what Goloka is, and /about says so in public.
//
// ONE STORY PER NAME. vaishnava-calendar.ts holds 36 dated entries but only
// 24 distinct ekādaśīs; Kāmikā falls in both 2026 and 2027 and is one story,
// keyed by ekadashiSlug(name). Every year after 2027 reuses these unchanged.
//
// ART. Panels carry `art: true` when an illustration exists at
// public/ekadashi/<slug>/panel-N.webp - the path is DERIVED from position, so
// adding art is dropping a correctly-named file in and flipping one flag,
// with no filename to typo. A panel without art renders the Jali lattice
// (DESIGN.md §6), which is a designed state, not a placeholder: a story with
// no art at all still reads as finished.

export type StoryPanel = {
  /** The narration under this panel. Reverent - comic FORM, never comic tone. */
  caption: string;
  /** True once public/ekadashi/<slug>/panel-N.webp exists. */
  art?: true;
  /** "full" spans both grid columns for a beat that needs the width. */
  span?: "full";
};

export type EkadashiStory = {
  slug: string;
  /** IAST name, identical to the vaishnava-calendar.ts entry. */
  name: string;
  /** Lunar occasion, e.g. "Śrāvaṇa, kṛṣṇa-pakṣa". */
  occasion: string;
  /** The Purāṇa this māhātmya is recorded in. */
  purana: string;
  /** One sentence - card, meta description, and the calendar row. */
  summary: string;
  /** Other names this ekādaśī is titled under, ASCII as devotees actually
   * type them. Two separate problems, both measured against the catalogue
   * on 2026-08-01 rather than guessed:
   *
   *   1. TRANSLITERATION. Stripping diacritics from IAST gives the academic
   *      spelling, not the popular one - "Pāpamocanī" becomes "Papamocani"
   *      while every video in the catalogue says "Papamochani". Same for
   *      Pārśva/Parshva, Ṣaṭ-tilā/Shattila, Pāśāṅkuśā/Papankusha.
   *   2. GENUINE SECOND NAMES. Several ekādaśīs have two traditional names
   *      (Bhaimī is Jayā; Utthāna is Prabodhinī; Pārśva is Parivartinī),
   *      and a devotee's video may use either.
   *
   * Before these, three stories matched nothing at all. */
  aliases?: string[];
  panels: StoryPanel[];
};

const STORIES: EkadashiStory[] = [
  {
    slug: "sayani",
    name: "Śayanī Ekādaśī",
    occasion: "Āṣāḍha, śukla-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "The Lord enters His four-month yogic sleep, and a king ends a three-year drought by fasting for it.",
    aliases: ["Devshayani", "Devasayani", "Shayani", "Hari Shayani", "Padma"],
    panels: [
      {
        caption:
          "In the age when Māndhātā ruled, no rain fell for three years. The granaries emptied, the wells went to dust, and the king — who had never failed his people — found that righteousness alone was not bringing back the sky.",
      },
      {
        caption:
          "He went to the forest and found Aṅgirā Muni seated among the trees. The sage did not offer him a policy. He offered him a day: observe Śayanī Ekādaśī, and let the whole kingdom observe it with you.",
      },
      {
        caption:
          "So they did — the ministers, the farmers, the children. On this ekādaśī Lord Viṣṇu lies down upon Ananta Śeṣa and begins Cāturmāsya, four months of yogic sleep, and the whole world quiets around Him.",
        span: "full",
      },
      {
        caption:
          "The rain came. Not as reward for a transaction, but because a kingdom had turned together toward the sleeping Lord — which is what this day asks of anyone who keeps it.",
      },
    ],
  },
  {
    slug: "kamika",
    name: "Kāmikā Ekādaśī",
    occasion: "Śrāvaṇa, kṛṣṇa-pakṣa",
    purana: "Padma Purāṇa, Brahma-vaivarta-khaṇḍa",
    summary:
      "A warrior who killed a brāhmaṇa in anger finds the one atonement the sages will accept.",
    panels: [
      {
        caption:
          "A kṣatriya quarrelled with a brāhmaṇa, and in the heat of it struck him dead. The anger passed in a moment. What it left did not pass at all.",
      },
      {
        caption:
          "He went to perform the funeral rites and the assembled brāhmaṇas refused him. There is no rite, they said, for what you have done. Come no closer to the fire.",
      },
      {
        caption:
          "The sages he begged for atonement named Kāmikā Ekādaśī — and told him something stranger still: that the mercy of this one day exceeds bathing at every holy river a pilgrim could walk to in a lifetime.",
        span: "full",
      },
      {
        caption:
          "He kept it. Not because a fast undoes a killing, but because the day carries the Lord's own name into a heart that has nothing else left to offer — and that is what Kāmikā means: the fulfiller of desires, including the desire to be clean again.",
      },
    ],
  },
  {
    slug: "pavitraropana",
    name: "Pavitrāropaṇā Ekādaśī",
    occasion: "Śrāvaṇa, śukla-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "A childless king learns that his sorrow has a cause he cannot see, and a remedy he can.",
    // "Shravana Putrada" is QUALIFIED on purpose. This ekādaśī is widely
    // called simply "Putradā", which is also the Pauṣa story's name - the
    // bare word would hand each of them the other's classes. The month
    // disambiguates; an empty shelf is better than a confidently wrong one.
    aliases: ["Pavitropana", "Pavitra", "Pavitraropana", "Shravana Putrada", "Sravana Putrada"],
    panels: [
      {
        caption:
          "King Mahījita of Māhiṣmatī had ruled well for many years and had no son. He told his ministers plainly: I have given charity, I have protected the innocent, and still my house will end with me. Why?",
      },
      {
        caption:
          "The ministers went into the forest to the sage Lomaśa — a ṛṣi so old that a single hair fell from his body at the close of each kalpa, and who therefore remembered everything.",
      },
      {
        caption:
          "Lomaśa looked into the king's former life and found a small cruelty: on a hot day, at a pond, he had driven away a thirsty cow so that he might drink first. That was all. That was enough.",
        span: "full",
      },
      {
        caption:
          "Observe Pavitrāropaṇā Ekādaśī, the sage said, and let the merit be given to the king. The citizens fasted on his behalf, and a son was born to Māhiṣmatī — mercy arriving through the people he had governed.",
      },
    ],
  },
  {
    slug: "annada",
    name: "Annadā Ekādaśī",
    occasion: "Bhādrapada, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "Hariścandra, who had lost everything rather than tell one lie, is given it all back.",
    aliases: ["Aja"],
    panels: [
      {
        caption:
          "Hariścandra had been a great king. To keep a promise he had given away his kingdom, then sold his wife, then his son, and finally himself — to a keeper of the cremation grounds.",
      },
      {
        caption:
          "So the emperor of the earth stood among the burning pyres collecting the tax on the dead, and did not complain, because he had said he would and he had meant it.",
      },
      {
        caption:
          "The sage Gautama found him there. He did not tell him to be patient. He told him a date: Annadā Ekādaśī, in the dark fortnight of Bhādrapada. Keep it, and see.",
        span: "full",
      },
      {
        caption:
          "He kept it. His son was restored to life, his wife returned to him, his kingdom came back — and the devas rained flowers on a man who had held to the truth when it cost him literally everything he had.",
      },
    ],
  },
  {
    slug: "parsva",
    name: "Pārśva Ekādaśī",
    occasion: "Bhādrapada, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "The sleeping Lord turns onto His other side — and Vāmana's three steps are remembered.",
    aliases: ["Parshva", "Parivartini", "Vamana"],
    panels: [
      {
        caption:
          "Midway through Cāturmāsya, the Lord turns. He has been lying on Ananta Śeṣa since Śayanī; on this day He shifts to His other side, and the day is called Pārśva — the side — or Parivartinī, the turning.",
      },
      {
        caption:
          "Yudhiṣṭhira asked Kṛṣṇa what a turn in sleep could possibly mean. Kṛṣṇa answered with Bali: the demon king who had conquered the three worlds and was, by every account, generous.",
      },
      {
        caption:
          "A small brāhmaṇa boy came to Bali's sacrifice and asked for three paces of land. Bali laughed and granted it. Then Vāmana grew, and two steps covered everything that existed.",
        span: "full",
      },
      {
        caption:
          "For the third step Bali offered his own head — and in taking everything from him, the Lord gave him what nobody else at that sacrifice received: His own foot upon him, and His personal company forever after.",
      },
    ],
  },
  {
    slug: "indira",
    name: "Indirā Ekādaśī",
    occasion: "Āśvina, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "A king meets his own father in a lower world, and fasts to bring him out of it.",
    panels: [
      {
        caption:
          "Nārada came to King Indrasena of Māhiṣmatī with news no son wants. I have come from Yamarāja's assembly, he said. Your father is there.",
      },
      {
        caption:
          "He broke a vow once, long ago — nothing more than that — and he asked me to carry a message to you: observe Indirā Ekādaśī, and give me the merit of it.",
      },
      {
        caption:
          "The king observed it exactly as Nārada instructed, and offered every particle of its merit to a man who could no longer act on his own behalf.",
      },
      {
        caption:
          "His father rose out of that place and went to Viṣṇu's abode. This is the day the tradition keeps for the departed — the one ekādaśī whose fruit is meant to be given away.",
        span: "full",
      },
    ],
  },
  {
    slug: "pasankusa",
    name: "Pāśāṅkuśā Ekādaśī",
    occasion: "Āśvina, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "A hunter who had done nothing good in his life is taken to Vaikuṇṭha for one day's fast.",
    aliases: ["Papankusha", "Pashankusha", "Pasankusha"],
    panels: [
      {
        caption:
          "In the Vindhya hills lived a hunter named Krodhana, whose name meant anger and whose life had matched it. He had killed for a living and cheated for pleasure and had, by any reckoning, no defence.",
      },
      {
        caption:
          "When the messengers of Yamarāja set a date for his death, he did what such men rarely do — he ran to the forest, to the sage Aṅgirā, and asked whether anything at all could be done.",
      },
      {
        caption:
          "The sage did not tell him he was a good man underneath. He told him to observe Pāśāṅkuśā Ekādaśī. That was the whole of the instruction.",
      },
      {
        caption:
          "He observed it, and was carried to Vaikuṇṭha — which is the scandal at the centre of this day, and the reason it is told at all: the mercy is not proportionate to the man.",
        span: "full",
      },
    ],
  },
  {
    slug: "rama",
    name: "Rāmā Ekādaśī",
    occasion: "Kārtika, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "A man too weak to fast keeps the fast anyway, and dies — and what he is given for it.",
    panels: [
      {
        caption:
          "Śobhana married Candrabhāgā, the daughter of King Mucukunda, and came to live in a kingdom where every citizen was required to observe ekādaśī. Śobhana's body could not bear a fast for a single day.",
      },
      {
        caption:
          "His wife told him the truth: here, nobody is exempt. He answered that he would rather die keeping it than live having broken it — and on Rāmā Ekādaśī, he did die.",
      },
      {
        caption:
          "Years later a brāhmaṇa travelling over Mandarācala came upon a city of gold in the mountains, and found Śobhana ruling it — beautiful, and troubled.",
        span: "full",
      },
      {
        caption:
          "The city flickers, Śobhana said, because I kept the fast without faith, only obedience. When Candrabhāgā was told, she went to him herself, and her faith made the golden city permanent.",
      },
    ],
  },
  {
    slug: "utthana",
    name: "Utthāna Ekādaśī",
    occasion: "Kārtika, śukla-pakṣa",
    purana: "Skanda Purāṇa",
    summary:
      "The Lord rises from four months of yogic sleep, and the year opens again.",
    aliases: ["Utthan", "Prabodhini", "Devutthana", "Haribodhini", "Dev Uthani"],
    panels: [
      {
        caption:
          "Four months after Śayanī, the Lord wakes. The day is Utthāna — the rising — and also Prabodhinī, the awakening. Cāturmāsya ends here.",
      },
      {
        caption:
          "The vows the devotees took for those four months are completed on this day: what was given up is given up for the last time, and offered.",
      },
      {
        caption:
          "Tulasī-devī is married to Śālagrāma-śilā on this day in temples and in courtyards, and lamps are lit in numbers nobody counts.",
      },
      {
        caption:
          "It falls in Kārtika, the month when even a small offering is said to be multiplied beyond measure — so the year's most auspicious season opens with the Lord opening His eyes.",
        span: "full",
      },
    ],
  },
  {
    slug: "utpanna",
    name: "Utpannā Ekādaśī",
    occasion: "Mārgaśīrṣa, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "The birthday of Ekādaśī herself — a goddess born from the Lord's own body to kill a demon no weapon could touch.",
    aliases: ["Utpatti"],
    panels: [
      {
        caption:
          "The demon Mura had driven the devas out of heaven. He could not be killed by any weapon in the hands of anyone awake — and he had made very sure of it.",
      },
      {
        caption:
          "Lord Viṣṇu fought him for a long age, and then withdrew into a cave on Badarikāśrama to sleep. Mura followed, raised his weapon over the sleeping Lord, and thought the war was over.",
      },
      {
        caption:
          "From the Lord's own body a goddess stepped out — luminous, armed, and entirely unexpected — and destroyed Mura where he stood.",
        span: "full",
      },
      {
        caption:
          "When He woke, the Lord asked her name. You were born of Me on the eleventh day, He said: you are Ekādaśī. Ask for a benediction. She asked that whoever fasts on her day be freed from sin — and this is that day, the day Ekādaśī herself appeared.",
      },
    ],
  },
  {
    slug: "moksada",
    name: "Mokṣadā Ekādaśī",
    occasion: "Mārgaśīrṣa, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "Gītā-jayantī — the day the Bhagavad-gītā was spoken, and a son frees his father with its merit.",
    aliases: ["Mokshada"],
    panels: [
      {
        caption:
          "On this day, between two armies that had not yet moved, Kṛṣṇa spoke the Bhagavad-gītā to Arjuna. Every year this ekādaśī carries that anniversary — Gītā-jayantī.",
      },
      {
        caption:
          "King Vaikhānasa dreamt of his father in a place of suffering, calling to him. He woke and could not put it down, and asked the brāhmaṇas what a son could do for a father already gone.",
      },
      {
        caption:
          "The sage Parvata told him: observe Mokṣadā Ekādaśī and give the merit to your father. Mokṣadā — the giver of liberation — is named for exactly this.",
        span: "full",
      },
      {
        caption:
          "He did, and his father was released. The day holds both things at once: the book that explains how to be free, and the fast that frees somebody who can no longer read it.",
      },
    ],
  },
  {
    slug: "saphala",
    name: "Saphalā Ekādaśī",
    occasion: "Pauṣa, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "A wicked prince observes the fast by accident, in a forest, without knowing what he is doing.",
    aliases: ["Safala"],
    panels: [
      {
        caption:
          "Lumpaka, son of King Māhiṣmata, robbed his father's own subjects and mocked the brāhmaṇas until the king banished him to the forest to live or not live as he managed.",
      },
      {
        caption:
          "He survived there by stealing, sleeping under an old banyan. On the night before Saphalā Ekādaśī the cold was such that he could not sleep, and the next day he was too weak to hunt.",
      },
      {
        caption:
          "So he ate nothing, and stayed awake through the night beneath the tree — the fast and the vigil, kept perfectly, by a man who had no idea he was keeping them.",
        span: "full",
      },
      {
        caption:
          "Something in him turned. He went home, was received by his father, ruled well, and gave the kingdom to his own son in time. Saphalā means fruitful — and the fruit came to a man who had not even planted it on purpose.",
      },
    ],
  },
  {
    slug: "putrada",
    name: "Putradā Ekādaśī",
    occasion: "Pauṣa, śukla-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "A king and queen of Bhadrāvatī, grieving that they have no heir, are sent to the sages by a deer.",
    aliases: ["Pausha Putrada", "Pausa Putrada"],
    panels: [
      {
        caption:
          "King Suketumān of Bhadrāvatī and Queen Śaibyā had no child. The grief had gone on so long that the king finally left the palace for the forest, intending not to return.",
      },
      {
        caption:
          "He wandered without food or water until he came upon a lake ringed with lotuses, and around it the āśramas of sages who had been waiting, they said, for him.",
      },
      {
        caption:
          "They told him the day was Putradā Ekādaśī, the giver of sons, and that he had arrived on it — and instructed him to observe it before he did anything else.",
      },
      {
        caption:
          "He fasted there among them and went home. A son was born to Bhadrāvatī who grew to be everything the kingdom needed — and the king had gone into the forest to die.",
        span: "full",
      },
    ],
  },
  {
    slug: "sat-tila",
    name: "Ṣaṭ-tilā Ekādaśī",
    occasion: "Māgha, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "A woman who fasted perfectly and gave nothing away learns what a fast is actually for.",
    aliases: ["Shattila", "Sattila", "Shat-tila", "Sat Tila"],
    panels: [
      {
        caption:
          "There was a brāhmaṇī who kept every vow. She fasted on every ekādaśī, worshipped daily, and was, in the technical sense, faultless. She had also never given anything to anyone.",
      },
      {
        caption:
          "The Lord Himself came to her door as a beggar and asked for alms. She gave him a lump of clay. He took it, and said nothing, and left.",
      },
      {
        caption:
          "When she reached the spiritual world by the strength of her fasting, she found a house there — and it was completely empty. All her austerity had built the walls. Nothing had furnished them.",
        span: "full",
      },
      {
        caption:
          "This day teaches the correction: sesame in six ways — bathing with it, offering it, giving it away, eating it, and the rest. Ṣaṭ-tilā is the ekādaśī that insists a fast is incomplete until something leaves your hands.",
      },
    ],
  },
  {
    slug: "bhaimi",
    name: "Bhaimī Ekādaśī",
    occasion: "Māgha, śukla-pakṣa",
    purana: "Padma Purāṇa",
    summary:
      "Two singers of heaven are cursed to become demons, and one day undoes it.",
    aliases: ["Jaya", "Bhishma", "Bhaimi"],
    panels: [
      {
        caption:
          "In Indra's assembly the Gandharva Mālyavān sang while the dancer Puṣpavatī danced. They looked at each other, and the song went wrong — the rhythm broke in front of the king of heaven.",
      },
      {
        caption:
          "Indra's curse was immediate: fall to the Himālayas as piśācas, and live there. They lost their beauty, their voices and their memory of who they had been.",
      },
      {
        caption:
          "For a long time they lived in that condition on the mountain, in cold and hunger, without knowing what they had lost.",
      },
      {
        caption:
          "On Bhaimī Ekādaśī — Jayā — they took no food, having nothing to take, and passed the night awake. In the morning their forms returned to them, and they went back to the heavens as they were.",
        span: "full",
      },
    ],
  },
  {
    slug: "vijaya",
    name: "Vijayā Ekādaśī",
    occasion: "Phālguna, kṛṣṇa-pakṣa",
    purana: "Skanda Purāṇa",
    summary:
      "Lord Rāma, stopped at the ocean with an army and no way across, is given a day instead of a plan.",
    panels: [
      {
        caption:
          "Rāma reached the southern shore with the army of monkeys behind Him and the sea in front, and Sītā across it. There was no bridge, and no obvious way there would be one.",
      },
      {
        caption:
          "Lakṣmaṇa suggested the sage Bakadālbhya, whose āśrama stood nearby, and Rāma went to him — the Supreme Lord, in the role He had taken, asking a ṛṣi what to do.",
      },
      {
        caption:
          "Observe Vijayā Ekādaśī, the sage said, with the whole army. Not a stratagem. A day.",
      },
      {
        caption:
          "They observed it on the shore, and the ocean gave way to the bridge. Vijayā means victory — and it is remembered as the ekādaśī that is kept before an undertaking, not after it.",
        span: "full",
      },
    ],
  },
  {
    slug: "amalaki",
    name: "Āmalakī Ekādaśī",
    occasion: "Phālguna, śukla-pakṣa",
    purana: "Brahmāṇḍa Purāṇa",
    summary:
      "A hunter hides in a tree from his own enemies and is protected by what grows there.",
    aliases: ["Amalaka", "Amla"],
    panels: [
      {
        caption:
          "The āmalakī tree is said to have appeared from Brahmā himself, and Lord Viṣṇu is present in it. On this ekādaśī the tree is worshipped, circled with lamps, and fasted beneath.",
      },
      {
        caption:
          "In the kingdom of Vaidiśa, every citizen kept the ekādaśī vow — even the animals, the Purāṇa says, were not fed on that day.",
      },
      {
        caption:
          "One night a hunter, hungry and hunted himself, took shelter in the branches of an āmalakī tree where the townspeople had been keeping their vigil, and stayed awake there all night because he was afraid to move.",
        span: "full",
      },
      {
        caption:
          "He had fasted, and kept vigil, and spent the night at the foot of the Lord's own tree — all of it by accident, all of it counted. He was born next as a king.",
      },
    ],
  },
  {
    slug: "papamocani",
    name: "Pāpamocanī Ekādaśī",
    occasion: "Caitra, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "A sage loses fifty-seven years to a single distraction, and the apsarā who caused it pays for it too.",
    aliases: ["Papamochani"],
    panels: [
      {
        caption:
          "Medhāvī was a young sage of the Cyavana line, performing austerities in the forest near Citraratha's pleasure garden, where the Gandharvas came to enjoy themselves.",
      },
      {
        caption:
          "The apsarā Mañjughoṣā was told to break his concentration. She did not dare come close while he was absorbed, so she sang at a distance, and waited, and he opened his eyes.",
      },
      {
        caption:
          "Fifty-seven years passed. When Medhāvī finally noticed what had become of his austerity he cursed her to become a piśācī — and then had to live with the fact that his own weakness had cost her that.",
        span: "full",
      },
      {
        caption:
          "His father sent them both to the same remedy: Pāpamocanī Ekādaśī, the remover of sins. She was released from the curse, and he recovered what he had spent. The day does not choose between the tempted and the tempter.",
      },
    ],
  },
  {
    slug: "kamada",
    name: "Kāmadā Ekādaśī",
    occasion: "Caitra, śukla-pakṣa",
    purana: "Varāha Purāṇa",
    summary:
      "A wife fasts to turn her husband back from the monster a curse has made of him.",
    panels: [
      {
        caption:
          "The Gandharva Lalita sang in the court of King Puṇḍarīka, and while he sang he thought of his wife Lalitā, and the words came out wrong.",
      },
      {
        caption:
          "The king's curse turned him into a rākṣasa — enormous, terrible and hungry — and he wandered the forests of the Vindhya hills in that shape, no longer able to speak to anyone.",
      },
      {
        caption:
          "Lalitā followed him. She did not leave, and she did not accept it; she went to the sage Śṛṅgi on Mount Vindhyācala and asked what a wife could do.",
      },
      {
        caption:
          "Observe Kāmadā Ekādaśī, he said, and give your husband the merit. She fasted, offered it to him, and the rākṣasa fell away — he stood there as a Gandharva again, and they returned to the heavens together.",
        span: "full",
      },
    ],
  },
  {
    slug: "varuthini",
    name: "Varūthinī Ekādaśī",
    occasion: "Vaiśākha, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    summary:
      "A king meditating in the forest is dragged away by a bear, and does not break his meditation.",
    panels: [
      {
        caption:
          "King Māndhātā left his kingdom for the forest to perform austerities, and sat in meditation beneath the trees for a long time without moving.",
      },
      {
        caption:
          "A bear came and began to gnaw at his foot. The king felt it. He did not open his eyes, and he did not cry out, because he had undertaken to sit and he was sitting.",
      },
      {
        caption:
          "The bear dragged him away from the seat entirely. Only then did Māndhātā call out — not for rescue, but to Viṣṇu — and the Lord came and killed the bear with His disc.",
        span: "full",
      },
      {
        caption:
          "The king's foot was gone. Observe Varūthinī Ekādaśī, the Lord told him — varūthinī means armour, that which protects — and his body was restored to him whole.",
      },
    ],
  },
  {
    slug: "mohini",
    name: "Mohinī Ekādaśī",
    occasion: "Vaiśākha, śukla-pakṣa",
    purana: "Kūrma Purāṇa",
    summary:
      "The day of the Lord's most beautiful deception, and of a wastrel son who is given it as a remedy.",
    aliases: ["Mohini"],
    panels: [
      {
        caption:
          "When the ocean was churned and the nectar came up, the demons seized it, and the devas had no way to take it back by force. So the Lord assumed the form of Mohinī — and the demons handed it over themselves.",
      },
      {
        caption:
          "In a town on the Sarasvatī lived Dhṛṣṭabuddhi, son of the merchant Dhanapāla, who drank and gambled and consorted with thieves until his father put him out of the house.",
      },
      {
        caption:
          "He robbed travellers in the forest until he was caught, and fled, and came half-starved to the āśrama of Kauṇḍinya Muni — who did not lecture him.",
      },
      {
        caption:
          "Observe Mohinī Ekādaśī. He did, and everything he had done fell away from him. The day is named for a form the Lord took to bewilder — and it is kept by people who need to be un-bewildered.",
        span: "full",
      },
    ],
  },
  {
    slug: "apara",
    name: "Aparā Ekādaśī",
    occasion: "Jyeṣṭha, kṛṣṇa-pakṣa",
    purana: "Brahmāṇḍa Purāṇa",
    summary:
      "A murdered king becomes a ghost in a pipal tree, and a sage passing by does something about it.",
    aliases: ["Achala", "Achhala"],
    panels: [
      {
        caption:
          "King Mahīdhvaja was righteous, and his younger brother could not bear it. He killed him and buried the body in the forest under a pipal tree, and told no one.",
      },
      {
        caption:
          "Because the rites were never performed, the king became a ghost, bound to that tree — and being what he was, he troubled everyone who passed beneath it.",
      },
      {
        caption:
          "The sage Dhaumya came that way, saw what the spirit had been, and asked him. The ghost told him the whole thing, and the sage stayed.",
      },
      {
        caption:
          "Dhaumya observed Aparā Ekādaśī and gave the merit to the murdered king, who rose out of that tree in a celestial form and went upward — released by a man who had no obligation to him at all.",
        span: "full",
      },
    ],
  },
  {
    slug: "pandava-nirjala",
    name: "Pāṇḍava Nirjalā Ekādaśī",
    occasion: "Jyeṣṭha, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "Bhīma, who could not fast at all, is given one day that counts for all twenty-four.",
    aliases: ["Nirjala", "Bhima", "Bhimseni", "Pandava"],
    panels: [
      {
        caption:
          "All the Pāṇḍavas observed ekādaśī. Bhīma could not. He was honest about why: there is a fire in my stomach called vṛka, and when it is not fed I am not able to think.",
      },
      {
        caption:
          "It shamed him. His mother fasted, his brothers fasted, Draupadī fasted — and the strongest man among them was the only one who broke it, every single time.",
      },
      {
        caption:
          "He went to his grandfather Vyāsadeva and asked whether there was any way at all, for a man built as he was built, to keep the vow.",
        span: "full",
      },
      {
        caption:
          "There is one day, Vyāsa said. Jyeṣṭha, śukla-pakṣa. Take no food and no water — nirjala, waterless — for that one, and you will have the merit of all twenty-four. Bhīma kept it, and it has carried his name ever since.",
      },
    ],
  },
  {
    slug: "yogini",
    name: "Yoginī Ekādaśī",
    occasion: "Āṣāḍha, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    summary:
      "A servant of Kuvera, cursed with leprosy for a stolen hour with his wife, is healed.",
    panels: [
      {
        caption:
          "Hemamālī was a yakṣa in the service of Kuvera, and his one duty was to bring flowers from Mānasa-sarovara each morning for the worship of Lord Śiva.",
      },
      {
        caption:
          "He gathered the flowers and then went home to his wife Viśālākṣī, and stayed — and the hour for the worship came and went with Kuvera waiting and the flowers still in the house.",
      },
      {
        caption:
          "Kuvera's curse was leprosy, and separation from the wife he had stayed for. Hemamālī went down to the earth diseased and alone, and wandered a long time in the Himālayas.",
        span: "full",
      },
      {
        caption:
          "He came to Mārkaṇḍeya Ṛṣi, who told him to observe Yoginī Ekādaśī. He observed it, his body was restored, and he returned to his own place — and to her.",
      },
    ],
  },
];

const BY_SLUG = new Map(STORIES.map((story) => [story.slug, story]));

/** The story for a slug, or null - /ekadashi/[slug] 404s on null rather than
 * rendering a page with a name and no māhātmya. */
export function storyForSlug(slug: string): EkadashiStory | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The story for a registry entry's NAME (what /calendar and vaishnava-today
 * hold). Null while an ekādaśī is in the calendar but not yet written up. */
export function storyForName(name: string): EkadashiStory | null {
  return storyForSlug(ekadashiSlug(name));
}

/** Every story, for generateStaticParams and the index. */
export function allStories(): EkadashiStory[] {
  return STORIES;
}

/** The public path for a panel's art. DERIVED from position so that adding an
 * illustration is dropping `panel-3.webp` into public/ekadashi/<slug>/ and
 * setting `art: true` - there is no filename in the data to mistype. */
export function panelArtPath(slug: string, index: number): string {
  return `/ekadashi/${slug}/panel-${index + 1}.webp`;
}

/** Title keywords for the "classes on this ekādaśī" shelf.
 *
 * DELIBERATELY the two-word phrase ("Kamika Ekadashi"), never the bare name.
 * data.ts's own comment warns that titleKeywords is substring matching and
 * false-positives ("radha" inside "aradhana"), and these names are worse
 * than most: bare "Vijaya" matches every video from Vijayawada, bare "Rama"
 * matches the entire Rāmāyaṇa, bare "Putrada" is fine but "Jaya" is not.
 * Pairing the name with the word that must follow it removes all of that.
 *
 * Both common ASCII spellings are included because devotees title videos
 * both ways; the diacritic form is not, since ILIKE will not fold "Ekādaśī"
 * onto "Ekadashi" anyway. The cost is recall - a class titled only
 * "Śrī Kāmikā-vrata" will be missed. That is the right trade for a shelf
 * sitting under a sacred story: an empty shelf is honest, a wrong video
 * under the wrong ekādaśī is not. */
export function titleKeywordsFor(story: EkadashiStory): string[] {
  const plain = story.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*Ekadasi\s*$/i, "")
    .trim();
  // Deduped: an alias may repeat the stripped name (Bhaimī lists "Bhaimi"),
  // and a duplicate ILIKE in the OR would cost a scan for nothing.
  const stems = [...new Set([plain, ...(story.aliases ?? [])])];
  return stems.flatMap((stem) => [`${stem} Ekadashi`, `${stem} Ekadasi`]);
}

/** ISKCON Desire Tree's SEARCH url for this ekādaśī, not a deep link.
 * Same reasoning DESIGN.md already records for the BBT store links on
 * /books: deep links rot, search is stable. Verified 2026-08-01 that
 * iskcondesiretree.com/page/ekadashi 404s while `?s=` resolves. */
export function desireTreeSearchUrl(name: string): string {
  const plain = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `https://iskcondesiretree.com/?s=${encodeURIComponent(plain)}`;
}

/** Ekādaśīs in the calendar that have no story yet - empty today, and a test
 * keeps it that way, so adding a date to vaishnava-calendar.ts without a
 * māhātmya fails the suite instead of shipping a dead "Read the story" link. */
export function ekadashisWithoutStory(): string[] {
  return distinctEkadashis()
    .filter(({ slug }) => !BY_SLUG.has(slug))
    .map(({ name }) => name);
}
