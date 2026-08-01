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
// WHAT WENT WRONG HERE, 2026-08-01, so it is not repeated. The first version
// of this file gave all 24 ekādaśīs a NARRATIVE, because the comic-panel
// format needed one. But many māhātmyas are not narratives at all - they are
// glorification: what the fast erases, what an offering outweighs, and no
// plot whatever. Where the Purāṇa gave only that, a story got invented to
// fill the panels, and shipped as scripture. Kāmikā gained a warrior who
// killed a brāhmaṇa and was refused the funeral fire; Aparā gained a murdered
// king haunting a pipal tree. Neither exists in the text.
//
// Two things changed as a result. `kind` now records what the source actually
// is, so a `glories` day renders the māhātmya's own comparisons instead of a
// fabricated plot - and those turned out to be the BETTER panels: one Tulasī
// leaf outweighing a treasury, thirty generations delivered by one fast, an
// axe taken to a full-grown forest of sinful deeds. And WITHDRAWN below is
// where a fabrication goes the moment it is found - unpublished, not left
// standing while it is fixed. It is empty again; all four were rewritten
// from source the same day.
//
// AND A CORRECTION TO THE CORRECTION. The audit that found this compared
// ASCII proper nouns exactly, and so reported Putradā as fabricated too -
// it searched for "Suketuman"/"Saibya" against a source that spells them
// "Suketumaan"/"Shaibyaa". That story was right all along and has been
// restored. Transliteration varies wildly across these texts; fold doubled
// vowels and sh/s, th/t, v/w before concluding a name is absent.
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
  /** The Purāṇa this māhātmya is recorded in.
   *
   * CHECKED AGAINST EACH SOURCE'S OWN CLOSING LINE, 2026-08-01, and 6 of the
   * 19 that state one were wrong: Mokṣadā is Brahmāṇḍa (not Brahma-vaivarta),
   * Saphalā and Bhaimī are Bhaviṣya-uttara (not Brahma-vaivarta and Padma),
   * and Śayanī, Utpannā and Ṣaṭ-tilā are Bhaviṣya-UTTARA, not Bhaviṣya. A
   * third of them wrong is the measure of how little a confident recollection
   * is worth here.
   *
   * FIVE ARE STILL UNVERIFIED because their source page states no attribution
   * at all: annada, pasankusa, papamocani, varuthini, pandava-nirjala. Those
   * five are my own best knowledge and, on the above hit rate, roughly one or
   * two of them are probably wrong. Check them against a printed Purāṇa
   * before treating them as settled. */
  purana: string;
  /** WHAT THE SOURCE ACTUALLY IS - added 2026-08-01 after an audit found
   * five stories here that scripture does not tell.
   *
   * Not every ekādaśī māhātmya is a narrative. Many are `glories`: the Lord
   * tells Yudhiṣṭhira what the fast erases and what an offering is worth,
   * with no plot and no characters at all. The first version of this file
   * assumed every ekādaśī had a story, because the panel format demanded
   * one - so where the Purāṇa gave only glorification, a narrative got
   * INVENTED to fill the panels. Kāmikā acquired a warrior who killed a
   * brāhmaṇa; Aparā a murdered king haunting a pipal tree. Neither is in the
   * text.
   *
   * This field exists so that can never be silent again: a story marked
   * `glories` must render the māhātmya's own comparisons, not a plot. */
  kind: "narrative" | "glories";
  /** ISKCON Desire Tree's page slug, verified to resolve. Their deep links
   * DO exist (/page/kamika-ekadasi) - an earlier probe tested /page/ekadashi,
   * got a 404, and wrongly concluded the whole pattern was unusable. Absent
   * where no page was found, and the link falls back to their search. */
  sourceSlug?: string;
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
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "sayana-ekadasi",
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
    purana: "Brahma-vaivarta Purāṇa",
    kind: "glories",
    sourceSlug: "kamika-ekadasi",
    summary:
      "No story is told for this day — only what it is worth, and what a single leaf of Tulasī outweighs.",
    panels: [
      {
        caption:
          "Yudhiṣṭhira asked which ekādaśī falls in the dark fortnight of Śrāvaṇa, and what it gives. Kṛṣṇa answered by repeating an older conversation still: what Brahmā, seated on his lotus, once told his son Nārada. No story follows. What follows is a reckoning.",
      },
      {
        caption:
          "Merely to hear these glories, Brahmā said, carries the merit of a horse sacrifice. To worship the four-armed Lord — conch, disc, club and lotus — on this day gives more than bathing in the Gaṅgā at Kāśī, more than Naimiṣāraṇya, more than Puṣkara, the one place where Brahmā himself is worshipped.",
      },
      {
        caption:
          "More, He said, than the darśana of Kedāranātha in the Himālayas. More than bathing at Kurukṣetra during a solar eclipse. More than giving away the entire earth with its forests and its oceans. The list goes on being outweighed, and the thing outweighing it is one day of fasting.",
        span: "full",
      },
      {
        caption:
          "Then the measure narrows to something a poor devotee can actually hold. A single leaf of Tulasī offered to the Lord pleases Him more than pearls, rubies, topaz, diamonds, lapis lazuli, sapphires and coral together. One leaf, against the contents of a treasury.",
      },
      {
        caption:
          "To see Tulasī-devī on this day removes sin; to touch her and pray removes disease. One who waters her need never fear Yamarāja. One who plants her will live with Kṛṣṇa. Not even Citragupta, who keeps the record of every deed, can total the merit of a ghee lamp offered before her.",
      },
      {
        caption:
          "And this day, Brahmā said, erases even the killing of a brāhmaṇa. Then he added the warning that belongs with it: no one may plan on that. To sin knowingly, intending to be cleared afterwards, is an abomination. The mercy is real, and it is not a loophole.",
        span: "full",
      },
    ],
  },
  {
    slug: "pavitraropana",
    name: "Pavitrāropaṇā Ekādaśī",
    occasion: "Śrāvaṇa, śukla-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    kind: "narrative",
    sourceSlug: "pavitropana-ekadasi",
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
    kind: "narrative",
    sourceSlug: "annada-ekadasi",
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
    kind: "narrative",
    sourceSlug: "parsva-ekadasi",
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
    kind: "narrative",
    sourceSlug: "indira-ekadasi",
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
    kind: "glories",
    sourceSlug: "pasankusa-ekadasi",
    summary:
      "No story is told for this day — only what one fast outweighs, and how far back through a family its mercy reaches.",
    aliases: ["Papankusha", "Pashankusha", "Pasankusha"],
    panels: [
      {
        caption:
          "Yudhiṣṭhira asked what falls in the bright fortnight of Āśvina. Kṛṣṇa named it Pāśāṅkuśā — some call it Pāpāṅkuśā, the goad that drives sin — and said the Lord to worship on it is Padmanābha, from whose navel the lotus grew.",
      },
      {
        caption:
          "A thousand horse sacrifices. A hundred Rājasūya sacrifices. Set against this one day of fasting, Kṛṣṇa said, they do not amount to a sixteenth part of it. There is no piety in the world equal to the piety of an ekādaśī kept.",
      },
      {
        caption:
          "And it does not stop at the one who keeps it. Ten generations of his mother's family, ten of his father's, ten of his wife's — thirty lines of the dead, delivered by one living person who went without food for a day.",
        span: "full",
      },
      {
        caption:
          "However fallen a soul may be, Kṛṣṇa said, if he takes shelter at the feet of Hari — who is expert at delivering the fallen — hell has no claim on him. Then a warning in the same breath: the Vaiṣṇava who criticises Śiva and the Śaivite who criticises Viṣṇu go there alike.",
      },
      {
        caption:
          "Anyone who spends his day without a single pious act is a dead man who happens to be breathing. His breath, Kṛṣṇa said, is the bellows of a blacksmith — moving air, and nothing living in it.",
      },
      {
        caption:
          "Dig a well. Sink a lake for other people to drink from. Give away gold, sesame, land, a cow, grain, water, an umbrella, a pair of shoes. And know which way round it runs: the direct fruit of this day is devotional service to Kṛṣṇa, and every good thing that comes with it is only the indirect one.",
        span: "full",
      },
    ],
  },
  {
    slug: "rama",
    name: "Rāmā Ekādaśī",
    occasion: "Kārtika, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "rama-ekadasi",
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
    kind: "narrative",
    sourceSlug: "utthana-ekadasi",
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
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "utpanna-ekadasi",
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
    purana: "Brahmāṇḍa Purāṇa",
    kind: "narrative",
    sourceSlug: "mokshada-ekadasi",
    summary:
      "Gītā-jayantī — the day the Bhagavad-gītā was spoken, and a son frees his father with its merit.",
    aliases: ["Mokshada"],
    panels: [
      {
        caption:
          "On this day, between two armies that had not yet moved, Kṛṣṇa spoke the Bhagavad-gītā to Arjuna at Kurukṣetra — at the spot now called Jyotiṣa-tīrtha. Every year this ekādaśī carries that anniversary, and to give a Gītā away on it is said to draw the Lord's own blessing.",
      },
      {
        caption:
          "In Campaka-nagara, King Vaikhānasa dreamt of his father in a hellish place, crying out to him to be delivered. He woke and could not put it down. His kingdom, his treasury, his own wife and sons all became unbearable to him — what use is a powerful son, he asked, if his father suffers?",
      },
      {
        caption:
          "The brāhmaṇas sent him to Parvata Muni, who knows past, present and future alike. Observe Mokṣadā Ekādaśī, the sage told him, and give its merit to your father. Mokṣadā — the giver of liberation — is named for exactly this.",
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
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "saphala-ekadasi",
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
    kind: "narrative",
    sourceSlug: "putrada-ekadasi",
    summary:
      "A king rides into the forest meaning never to come back, and finds ten sages bathing at a lotus lake.",
    aliases: ["Pausha Putrada", "Pausa Putrada"],
    panels: [
      {
        caption:
          "King Suketumān of Bhadrāvatī and Queen Śaibyā had no child. The grief had a particular shape: without a son there would be no one to offer tarpaṇa, so their own forefathers were said to be anxious too — the sorrow ran backwards as well as forwards.",
      },
      {
        caption:
          "Nothing consoled him. Not his ministers, not his friends, not his elephants and horses. The thought of ending his own life came and was put away again, because he knew where it led. So he mounted his horse and rode alone into the deep forest, and told nobody — not even the priests of his palace — where he had gone.",
      },
      {
        caption:
          "He wandered among fig and bel and jackfruit and śāla, past deer and tigers and boar, past cow elephants with their calves close beside them. Everything in that forest had its young with it. By midday he was lost, and hungry, and asking what sin of his this was.",
        span: "full",
      },
      {
        caption:
          "Then he came on a pond like Lake Mānasarovara, lotuses open to the sun, swans and cranes on the water, āśramas along the shore. His right arm and right eye began to quiver — the old sign that something auspicious is about to happen.",
      },
      {
        caption:
          "Ten sages sat at the water chanting on their beads. They were the Viśvadevas, come there to bathe; they had not come for him at all. When he had bowed and praised them, they asked what was on his heart — and told him that today, as it happened, was Putradā Ekādaśī.",
      },
      {
        caption:
          "He fasted there among them and went home. A son was born to Bhadrāvatī who grew into everything the kingdom needed. The king had ridden out to die, and was met on the road by a day.",
        span: "full",
      },
    ],
  },
  {
    slug: "sat-tila",
    name: "Ṣaṭ-tilā Ekādaśī",
    occasion: "Māgha, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "sattila-ekadasi",
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
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "bhaimi-ekadasi",
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
    kind: "narrative",
    sourceSlug: "vijaya-ekadasi",
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
    kind: "narrative",
    sourceSlug: "amalaki-ekadasi",
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
    kind: "narrative",
    sourceSlug: "papamocani-ekadasi",
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
    kind: "narrative",
    sourceSlug: "kamada-ekadasi",
    summary:
      "A wife fasts to turn her husband back from the man-eater a king's curse has made of him.",
    panels: [
      {
        caption:
          "Kṛṣṇa told this to Yudhiṣṭhira as an old history — one Vasiṣṭha Muni had told King Dilīpa, the great-grandfather of Rāmacandra. It begins in Ratnapura, a city of gold and jewels where Gandharvas, Kinnaras and Apsarās lived under King Puṇḍarīka.",
      },
      {
        caption:
          "Among the Gandharvas were the singer Lalit and his wife Lalitā, a dancer, who loved each other past all sense. One day Lalit sang at court without her, thinking of her as he sang — and lost the metre, and finished the song wrongly.",
      },
      {
        caption:
          "An envious snake in attendance carried it to the king: he was thinking of a woman, not of you. Puṇḍarīka's eyes went crimson. For preferring a wife to your sovereign, he said, become a cannibal — and Lalit became one, arms eight miles long, his neck a mountain, sixty-four miles high.",
        span: "full",
      },
      {
        caption:
          "Lalitā did not leave. She followed the thing her husband had become through the deep jungle while it did what such creatures do, and wept, and kept following.",
      },
      {
        caption:
          "On the peak of Vindhyācala she found the sage Śṛṅgi. She told him whose daughter she was and what had been done, and asked the only question she had: what act can I perform on his behalf? Kāmadā Ekādaśī is coming, he said. Keep it, and give him what you earn.",
      },
      {
        caption:
          "She kept it, and on the dvādaśī stood before the sage and the Deity of Vāsudeva and gave the merit away to her husband. The curse lifted where he stood. Lalit was a Gandharva again, ornaments and all, and the two of them went up to heaven together.",
        span: "full",
      },
    ],
  },
  {
    slug: "varuthini",
    name: "Varūthinī Ekādaśī",
    occasion: "Vaiśākha, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    kind: "glories",
    sourceSlug: "varuthini-ekadasi",
    summary:
      "No story is told for this day — only a ladder of charities, each outdone by the next, and all of them by one fast.",
    panels: [
      {
        caption:
          "Varūthinī means armour. Kṛṣṇa told Yudhiṣṭhira that a complete fast on this day removes sin, gives happiness that does not stop, and makes even an unfortunate woman fortunate — enjoyment in this life and liberation at the end of it.",
      },
      {
        caption:
          "Two names are given, and no stories with them. King Māndhātā was liberated by observing this day. Dhundhumāra of the Ikṣvāku line was freed by it from the leprosy Lord Śiva's curse had laid on him. That is all the Purāṇa says of either man.",
      },
      {
        caption:
          "Then the ladder. Better than giving horses is giving elephants; better than elephants, land; better than land, sesame seeds; better than sesame, gold. Better than gold is giving grain — because forefathers, devas and human beings are all alike satisfied by eating. There is no greater charity, past, present or future.",
        span: "full",
      },
      {
        caption:
          "And a hard turn. A man who lives off his daughter's wealth, or sells her, or takes money from the man he gave her to, becomes a cat in his next life. But one who gives a daughter in marriage with her dowry earns merit that Citragupta himself cannot write down.",
      },
      {
        caption:
          "The fast is three days wide. On the tenth: no bell-metal plates, no urad dāl or lentils or chickpeas, no honey, no eating twice, no eating in another's house. On the eleventh: no gambling, no daytime sleep, no rumour, no faultfinding, no anger, no lying. On the twelfth, the restraint is loosened slowly rather than dropped.",
      },
      {
        caption:
          "Every one of those charities — the gold, the grain, the daughter given well — is obtained by one who simply fasts on Varūthinī. And merely to hear this said, Kṛṣṇa told him, carries the merit of giving away a thousand cows.",
        span: "full",
      },
    ],
  },
  {
    slug: "mohini",
    name: "Mohinī Ekādaśī",
    occasion: "Vaiśākha, śukla-pakṣa",
    purana: "Kūrma Purāṇa",
    kind: "narrative",
    sourceSlug: "mohini-ekadasi",
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
    kind: "glories",
    sourceSlug: "apara-ekadasi",
    summary:
      "No story is told for this day — only a list of who is forgiven, and four images of how thoroughly.",
    aliases: ["Achala", "Achhala"],
    panels: [
      {
        caption:
          "Aparā means limitless. Kṛṣṇa told Yudhiṣṭhira that one who fasts on it becomes known throughout the universe, and that it erases even the killing of a brāhmaṇa, of a cow, of a child in the womb.",
      },
      {
        caption:
          "Then the list turns to smaller, more ordinary crimes, and is longer for them. The man who bears false witness. Who praises another sarcastically. Who cheats at the scales. Who invents his own scripture. The charlatan astrologer, the cheating accountant, the physician who is not one. All of them, the Purāṇa says, are bound for hell — and all of them are freed by this day.",
        span: "full",
      },
      {
        caption:
          "The soldier who runs from the battlefield goes to a ferocious hell; even he is freed. And the worst named here is not a murderer at all — it is the student who takes a full spiritual education from his guru and then blasphemes him. Even that one, Kṛṣṇa said. Even him.",
      },
      {
        caption:
          "What it equals, laid end to end: bathing three times a day at Puṣkara through Kārtika; at Prayāga in Māgha; serving Śiva at Vārāṇasī on Śiva-rātri; offering to the forefathers at Gayā; darśana at Kedāranātha and at Badrīnātha; Kurukṣetra under a solar eclipse, with cows and elephants and gold given away there.",
      },
      {
        caption:
          "Then the Purāṇa stops arguing and starts seeing. This day is an axe to a full-grown forest of sinful deeds. A forest fire, with the sins as kindling. The sun coming up in front of everything done in the dark. A lion, and impiety the meek deer it is walking toward.",
        span: "full",
      },
      {
        caption:
          "And the one who lets it pass? Born again as one bubble among millions on the water, or as an ant among all the species there are. So worship Trivikrama, who crossed the worlds in three steps, and keep the day.",
      },
    ],
  },
  {
    slug: "pandava-nirjala",
    name: "Pāṇḍava Nirjalā Ekādaśī",
    occasion: "Jyeṣṭha, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "pandava-nirjala-ekadasi",
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
    kind: "narrative",
    sourceSlug: "yogini-ekadasi",
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

/** Ekādaśīs whose first written story was INVENTED and has been pulled from
 * the site pending a rewrite from source (see the file header). These render
 * no page; /calendar and the home strip fall back to /topic/ekadashi, the
 * behaviour storyForName()'s null branch was already built for.
 *
 * Each entry records what the source actually says, so the rewrite starts
 * from a fact rather than from the same guess twice. Empty this array by
 * rewriting them, never by deleting the check. */
export const WITHDRAWN: { slug: string; name: string; sourceIs: string }[] = [
  // Empty as of 2026-08-01: all four withdrawn stories have been rewritten
  // from source, and Putradā - which the first audit flagged wrongly - has
  // been restored. Kept, with its tests, because the next fabrication
  // should land here rather than stay on the site.
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

/** ISKCON Desire Tree's page for this ekādaśī - their own telling of the
 * same māhātmya, credited and linked rather than copied.
 *
 * Prefers the DEEP link when the story records a verified `sourceSlug`. An
 * earlier version used search urls for all 24, on the strength of a probe
 * that requested /page/ekadashi, got a 404, and concluded the pattern did
 * not exist. It does: /page/kamika-ekadasi resolves, as do most others. The
 * search url survives as the fallback for the handful with no page found. */
export function desireTreeUrl(story: EkadashiStory): string {
  if (story.sourceSlug) return `https://iskcondesiretree.com/page/${story.sourceSlug}`;
  const plain = story.name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `https://iskcondesiretree.com/?s=${encodeURIComponent(plain)}`;
}

/** Ekādaśīs in the calendar with no story page. Today this is exactly the
 * WITHDRAWN set; a test pins that, so adding a date to vaishnava-calendar.ts
 * without a māhātmya fails the suite rather than shipping a dead link - and
 * so does quietly abandoning a withdrawn rewrite. */
export function ekadashisWithoutStory(): string[] {
  return distinctEkadashis()
    .filter(({ slug }) => !BY_SLUG.has(slug))
    .map(({ name }) => name);
}
