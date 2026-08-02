# Permission request — ISKCON Desire Tree

A draft note asking ISKCON Desire Tree for permission to reproduce the
ekādaśī māhātmyas on Goloka's `/ekadashi/<slug>` pages.

**Why this exists.** The māhātmyas come down through paramparā, so Goloka does
not paraphrase them (owner decision, 2026-08-02 — see `docs/DESIGN.md` §6).
Today the pages carry an illustrated retelling, clearly labelled as ours, and
link to IDT for the text itself. Permission is the one route to having the
authentic text on the page, unaltered, with the chain intact.

Send to the contact form at <https://iskcondesiretree.com/page/contact-us> or
whatever address they publish. Edit freely before sending — it should sound
like you, not like a form letter.

---

**Subject:** Permission to reproduce the Ekādaśī māhātmyas, with credit

Hare Kṛṣṇa,

Please accept my humble obeisances. All glories to Śrīla Prabhupāda.

My name is Sanjay. I run Goloka (https://goloka-three.vercel.app), a free,
non-commercial index of ISKCON content on YouTube — around 16,800 lectures,
kīrtans and festival recordings from 35 official temple and teacher channels,
gathered in one place so a devotee can find them without hunting. It carries
no advertising, sells nothing, and hosts no video: everything plays through
YouTube's own player and links back to the channel that made it.

I have recently added a page for each of the twenty-four ekādaśīs, tied to the
Vaiṣṇava calendar, so that a devotee who sees "Pāśāṅkuśā Ekādaśī" on the
calendar can learn what the day is and find classes about it.

I would like to ask your permission to reproduce the ekādaśī māhātmyas as they
appear on your pages — for example
https://iskcondesiretree.com/page/kamika-ekadasi — on those pages.

If you were willing, I would:

- reproduce the text **unaltered and in full**, never abridged or reworded;
- credit ISKCON Desire Tree by name at the head of every māhātmya;
- link prominently back to your page for that ekādaśī;
- state the Purāṇa each māhātmya is drawn from, as you do;
- remove any or all of it immediately if you ever asked.

I want to be straightforward about why I am asking rather than simply copying.
These texts have come down through paramparā, and I do not think they are mine
to re-word, summarise or improve. At present Goloka's ekādaśī pages carry only
an illustrated retelling in my own words — plainly labelled as mine, not as
scripture — and send devotees to you for the text itself. That works, but a
devotee is better served reading the māhātmya where they found the day.

If reproducing it is not something you wish to allow, I completely understand,
and Goloka will keep linking to you as it does now. If there is a different
source you would rather I used, or a form of credit you would prefer, I would
be glad to follow it.

Thank you for the seva you have been doing for so many years. Whatever you
decide, it has been a help to me personally.

Your servant,
Sanjay
nandisanjay.ns@gmail.com
https://goloka-three.vercel.app

---

## If they say yes

The plumbing is straightforward — a `mahatmyaText` field on `EkadashiStory`
holding the text verbatim, rendered under the panels, with the credit line and
the existing link-out card kept as-is. Do NOT re-introduce a paraphrase layer;
that approach was tried and discarded on 2026-08-01.

## If they say no, or do not reply

Nothing changes. The pages already work: panels labelled as a retelling, and
the `.mahatmya-link` card carrying the devotee to the text.

A second option worth knowing about: genuinely public-domain English
translations of these Purāṇas exist and could be reproduced with no permission
needed at all — for instance Rajendra Nath Sen's Brahma-vaivarta Purāṇa
(c. 1920, Sacred Books of the Hindus) at
https://archive.org/details/brahmavaivartapu04allauoft, and the Purāṇa
translations at https://www.wisdomlib.org. The trade-off is that the English is
a century old and the chapters do not map cleanly onto the twenty-four
ekādaśīs, so it would need real editorial work to use — but it is authentic,
unaltered, and free of any permission question.
