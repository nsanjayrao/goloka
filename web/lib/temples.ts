// The Temple Directory (/temples): a hand-curated registry of major ISKCON
// centers - the same editorial pattern as lib/topics.ts and lib/speakers.ts.
// Every temple links OUT to its official website; when Goloka indexes the
// temple's YouTube channel, the card also links INWARD to /channel/<handle>,
// and a temple whose channel is currently live-streaming gets the LIVE dot
// (matched by handle against getLiveVideos()).
//
// OWNER: add temples freely - order here is display order. Websites were
// verified at curation time (2026-07-18); they change rarely but do change.

export type Temple = {
  name: string;
  city: string;
  country: string;
  website: string;
  /** channels.json handle, when Goloka indexes this temple's channel. */
  channelHandle?: string;
};

export const TEMPLES: Temple[] = [
  {
    name: "Śrī Māyāpur Chandrodaya Mandir",
    city: "Māyāpur, West Bengal",
    country: "India",
    website: "https://www.mayapur.com",
    channelHandle: "@mayapurtvofficial",
  },
  {
    name: "Śrī Kṛṣṇa-Balarāma Mandir",
    city: "Vṛndāvana, Uttar Pradesh",
    country: "India",
    website: "https://www.iskconvrindavan.com",
    channelHandle: "@iskconvrndavan",
  },
  {
    name: "Śrī Śrī Rādhā Rāsabihārī Mandir",
    city: "Juhu, Mumbai",
    country: "India",
    website: "https://www.iskconmumbai.com",
    channelHandle: "@iskconjuhutemple",
  },
  {
    name: "Śrī Śrī Rādhā Gopīnāth Mandir",
    city: "Chowpatty, Mumbai",
    country: "India",
    website: "https://www.radhagopinath.com",
    channelHandle: "@rg108",
  },
  {
    name: "ISKCON Bangalore (Hare Krishna Hill)",
    city: "Bengaluru, Karnataka",
    country: "India",
    website: "https://www.iskconbangalore.org",
    channelHandle: "@ISKCONBangalore",
  },
  {
    name: "ISKCON Dwarka (Śrī Śrī Rukmiṇī Dwārkādhīś)",
    city: "Dwarka, New Delhi",
    country: "India",
    website: "https://www.iskcondwarka.org",
    channelHandle: "@iskcondwarka",
  },
  {
    name: "ISKCON East of Kailash (Śrī Śrī Rādhā Pārthasārathi)",
    city: "New Delhi",
    country: "India",
    website: "https://www.iskcondelhi.com",
  },
  {
    name: "Bhaktivedanta Manor",
    city: "Watford, Hertfordshire",
    country: "United Kingdom",
    website: "https://www.krishnatemple.com",
    channelHandle: "@krishnatemple",
  },
  {
    name: "ISKCON London (Rādhā-Kṛṣṇa Temple)",
    city: "Soho Street, London",
    country: "United Kingdom",
    website: "https://iskcon.london",
  },
];
