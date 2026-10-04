const H = {
  rose: ["var(--h-rose-t)", "var(--h-rose-b)", "var(--h-rose-x)"],
  amber: ["var(--h-amber-t)", "var(--h-amber-b)", "var(--h-amber-x)"],
  citron: ["var(--h-citron-t)", "var(--h-citron-b)", "var(--h-citron-x)"],
  fern: ["var(--h-fern-t)", "var(--h-fern-b)", "var(--h-fern-x)"],
  teal: ["var(--h-teal-t)", "var(--h-teal-b)", "var(--h-teal-x)"],
  sky: ["var(--h-sky-t)", "var(--h-sky-b)", "var(--h-sky-x)"],
  indigo: ["var(--h-indigo-t)", "var(--h-indigo-b)", "var(--h-indigo-x)"],
  violet: ["var(--h-violet-t)", "var(--h-violet-b)", "var(--h-violet-x)"],
};
export const hue = (name) => ({ tint: H[name][0], base: H[name][1], text: H[name][2] });

const P = (id, name, household, status, hueName, email, phone, tags, joined, groups) =>
  ({ id, name, initials: name.split(" ").map(w => w[0]).join(""), household, status, hue: hue(hueName), email, phone, tags, joined, groups });

export const people = [
  P(1, "Maria Carter", "Carter", "Member", "teal", "maria.carter@gmail.com", "(312) 555-0142", ["Worship", "Small group leader"], "Mar 2019", ["Wednesday Women", "Worship team"]),
  P(2, "James Carter", "Carter", "Member", "indigo", "james.carter@gmail.com", "(312) 555-0143", ["Ushers"], "Mar 2019", ["Men's breakfast"]),
  P(3, "Ruth Bennett", "Bennett", "Member", "amber", "ruth.b@outlook.com", "(773) 555-0187", ["Children's check-in"], "Sep 2016", ["Kids ministry"]),
  P(4, "Daniel Park", "Park", "Regular", "fern", "dpark@proton.me", "(312) 555-0199", [], "Jan 2026", ["Alpha course"]),
  P(5, "Grace Miller", "Miller", "Visitor", "rose", "grace.miller@gmail.com", "(708) 555-0121", ["First visit"], "Sep 2026", []),
  P(6, "Samuel Mensah", "Mensah", "Member", "violet", "sam.mensah@gmail.com", "(312) 555-0166", ["Tech team"], "Jun 2021", ["Tech team", "Young adults"]),
  P(7, "Hannah Lindqvist", "Lindqvist", "Regular", "sky", "hannah.l@gmail.com", "(847) 555-0133", ["Hospitality"], "Nov 2025", ["Hospitality"]),
  P(8, "Elijah Thompson", "Thompson", "Visitor", "citron", "e.thompson@gmail.com", "(312) 555-0178", ["First visit"], "Sep 2026", []),
  P(9, "Priya Raman", "Raman", "Member", "teal", "priya.r@gmail.com", "(630) 555-0150", ["Finance"], "Feb 2018", ["Finance committee"]),
  P(10, "Tomás Herrera", "Herrera", "Member", "amber", "tomas.h@gmail.com", "(312) 555-0109", ["Worship"], "Aug 2020", ["Worship team"]),
];

const FIRST = ["Abigail","Aaron","Beatrice","Caleb","Chloe","David","Deborah","Ethan","Esther","Felix","Faith","Gabriel","Hope","Isaac","Ivy","Jonah","Joy","Kate","Lena","Lucas","Miriam","Nathan","Naomi","Owen","Peter","Rachel","Rebecca","Simon","Sarah","Tyler","Uma","Victor","Wendy","Yusuf","Zoe","Andrew","Bella","Clara","Eric","Fiona"];
const LAST = ["Adler","Baptiste","Boateng","Castro","Diallo","Ellis","Fischer","Garcia","Hale","Irwin","Johnson","Kim","Lund","Mbeki","Novak","Osei","Ortiz","Patel","Quinn","Reyes","Santos","Tanaka","Underwood","Vance","Walker","Xu","Young","Zubair"];
const HUES = ["rose","amber","citron","fern","teal","sky","indigo","violet"];
const TAGS = [[], [], ["Hospitality"], ["Ushers"], ["Worship"], [], ["Kids ministry"], ["Tech team"], [], ["Prayer team"]];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const directory = (() => {
  const out = [];
  let i = 0;
  while (out.length < 202) {
    const f = FIRST[(i * 7) % FIRST.length], l = LAST[(i * 11 + 3) % LAST.length];
    const name = f + " " + l;
    if (!out.some(p => p.name === name)) {
      const n = out.length;
      const status = n < 138 ? "Member" : n < 177 ? "Regular" : "Visitor";
      out.push(P(100 + n, name, l, status, HUES[i % 8], (f + "." + l).toLowerCase() + "@gmail.com", "(312) 555-" + String(1000 + ((i * 37) % 9000)).slice(-4), TAGS[i % TAGS.length], MONTHS[i % 12] + " " + (status === "Visitor" ? 2026 : 2014 + (i % 12)), []));
    }
    i++;
  }
  return out;
})();

export const churches = [
  { name: "Grace Fellowship", city: "Chicago, IL", people: 212, attendance: [198, 215, 221, 209, 212], giving: 38420, health: "Healthy", active: "Today" },
  { name: "New Hope Community", city: "Evanston, IL", people: 164, attendance: [142, 138, 151, 147, 149], giving: 21900, health: "Healthy", active: "Today" },
  { name: "Riverside Chapel", city: "Joliet, IL", people: 96, attendance: [88, 81, 79, 74, 70], giving: 9800, health: "Declining", active: "2 days ago" },
  { name: "St. Andrew's", city: "Oak Park, IL", people: 241, attendance: [205, 211, 208, 219, 224], giving: 44100, health: "Healthy", active: "Today" },
  { name: "Living Word", city: "Aurora, IL", people: 58, attendance: [51, 49, 0, 0, 47], giving: 4200, health: "Needs setup", active: "3 weeks ago" },
];

export const careList = [
  { who: "Kwame Boateng", why: "Absent 4 Sundays", kind: "Absence", hue: "amber" },
  { who: "Esther Lund", why: "In hospital, Northwestern", kind: "Hospital", hue: "rose" },
  { who: "Abigail & Isaac Osei", why: "New baby, born Sep 30", kind: "Milestone", hue: "fern" },
  { who: "Peter Novak", why: "Bereavement, mother passed", kind: "Grief", hue: "violet" },
];
export const prayer = [
  { who: "Ruth Bennett", text: "Job interview on Tuesday", when: "Today" },
  { who: "Anonymous", text: "Healing for my father after surgery", when: "Yesterday" },
  { who: "Daniel Park", text: "Wisdom about baptism", when: "Sep 30" },
];
export const rosters = {
  g4: ["Samuel Mensah", "Daniel Park", "Grace Miller", "Elijah Thompson", "Joy Mbeki", "Nathan Kim", "Zoe Walker", "Lucas Reyes", "Chloe Baptiste", "Tyler Ellis", "Ivy Tanaka", "Jonah Quinn"],
};

export const servingDates = ["Oct 5", "Oct 12", "Oct 19", "Oct 26"];
export const teams = [
  { id: "worship", name: "Worship", hue: "violet", positions: ["Worship leader", "Keys", "Acoustic guitar", "Bass", "Drums", "Vocals"], pool: ["Tomás Herrera", "Maria Carter", "Joy Mbeki", "Lucas Reyes", "Nathan Kim", "Chloe Baptiste", "Isaac Osei", "Zoe Walker"] },
  { id: "kids", name: "Kids", hue: "amber", positions: ["Nursery lead", "Nursery helper", "Preschool lead", "Kids 1–3 lead", "Kids 4–6 lead", "Check-in desk"], pool: ["Ruth Bennett", "Sarah Kim", "Naomi Adler", "Esther Lund", "Deborah Hale", "Miriam Castro", "Rachel Ortiz", "Abigail Osei"] },
  { id: "hospitality", name: "Hospitality", hue: "sky", positions: ["Welcome desk", "Coffee", "Greeter"], pool: ["Hannah Lindqvist", "Lena Fischer", "Peter Novak", "Fiona Garcia", "Victor Santos"] },
  { id: "ushers", name: "Ushers", hue: "teal", positions: ["Head usher", "Usher", "Usher"], pool: ["James Carter", "Kwame Boateng", "Simon Patel", "Eric Young", "Andrew Hale"] },
  { id: "tech", name: "Tech", hue: "indigo", positions: ["Sound", "Slides", "Livestream"], pool: ["Samuel Mensah", "Jonah Quinn", "Tyler Ellis", "Lucas Reyes"] },
];
export const blockouts = { "Joy Mbeki": [1], "Sarah Kim": [0], "Lucas Reyes": [2], "Naomi Adler": [1, 2], "Peter Novak": [0, 1, 2, 3], "Kwame Boateng": [3] };
export const assignments = {
  "worship|0|0": { name: "Tomás Herrera", status: "accepted" }, "worship|1|0": { name: "Chloe Baptiste", status: "accepted" }, "worship|2|0": { name: "Nathan Kim", status: "accepted" }, "worship|3|0": { name: "Lucas Reyes", status: "accepted" }, "worship|4|0": { name: "Isaac Osei", status: "pending" }, "worship|5|0": { name: "Maria Carter", status: "accepted" },
  "worship|0|1": { name: "Tomás Herrera", status: "accepted" }, "worship|1|1": { name: "Zoe Walker", status: "pending" }, "worship|5|1": { name: "Joy Mbeki", status: "pending" },
  "worship|0|2": { name: "Maria Carter", status: "pending" }, "worship|4|2": { name: "Isaac Osei", status: "declined" },
  "kids|0|0": { name: "Ruth Bennett", status: "accepted" }, "kids|1|0": { name: "Miriam Castro", status: "accepted" }, "kids|2|0": { name: "Esther Lund", status: "declined" }, "kids|3|0": { name: "Deborah Hale", status: "accepted" }, "kids|4|0": { name: "Rachel Ortiz", status: "accepted" },
  "kids|0|1": { name: "Sarah Kim", status: "pending" }, "kids|3|1": { name: "Abigail Osei", status: "accepted" },
  "hospitality|0|0": { name: "Hannah Lindqvist", status: "pending" }, "hospitality|1|0": { name: "Lena Fischer", status: "accepted" },
  "ushers|0|0": { name: "James Carter", status: "accepted" }, "ushers|1|0": { name: "Simon Patel", status: "accepted" }, "ushers|2|0": { name: "Eric Young", status: "accepted" },
  "tech|0|0": { name: "Samuel Mensah", status: "accepted" }, "tech|1|0": { name: "Jonah Quinn", status: "accepted" }, "tech|2|0": { name: "Tyler Ellis", status: "accepted" },
};

export const songs = [
  { id: "s1", title: "Amazing Grace", author: "John Newton", ccli: "22025", key: "G", bpm: 66, last: "Sep 14", uses: 6, pd: true, seq: ["V1", "V2", "V3", "V4"], sections: [
    { label: "V1", type: "Verse", lines: ["Amazing grace! how sweet the sound", "That saved a wretch like me!", "I once was lost, but now am found;", "Was blind, but now I see."] },
    { label: "V2", type: "Verse", lines: ["'Twas grace that taught my heart to fear,", "And grace my fears relieved;", "How precious did that grace appear", "The hour I first believed."] },
    { label: "V3", type: "Verse", lines: ["Through many dangers, toils and snares,", "I have already come;", "'Tis grace hath brought me safe thus far,", "And grace will lead me home."] },
    { label: "V4", type: "Verse", lines: ["When we've been there ten thousand years,", "Bright shining as the sun,", "We've no less days to sing God's praise", "Than when we'd first begun."] } ] },
  { id: "s2", title: "It Is Well with My Soul", author: "Horatio Spafford, Philip Bliss", ccli: "25376", key: "C", bpm: 60, last: "Aug 31", uses: 4, pd: true, seq: ["V1", "C", "V2", "C"], sections: [
    { label: "V1", type: "Verse", lines: ["When peace like a river attendeth my way,", "When sorrows like sea billows roll;", "Whatever my lot, Thou hast taught me to say,", "It is well, it is well with my soul."] },
    { label: "C", type: "Chorus", lines: ["It is well with my soul,", "It is well, it is well with my soul."] },
    { label: "V2", type: "Verse", lines: ["Though Satan should buffet, though trials should come,", "Let this blest assurance control,", "That Christ hath regarded my helpless estate,", "And hath shed His own blood for my soul."] } ] },
  { id: "s3", title: "Be Thou My Vision", author: "Traditional Irish, tr. Mary Byrne", ccli: "30639", key: "D", bpm: 80, last: "Sep 7", uses: 5, pd: true, seq: ["V1", "V2"], sections: [
    { label: "V1", type: "Verse", lines: ["Be Thou my Vision, O Lord of my heart;", "Naught be all else to me, save that Thou art;", "Thou my best Thought, by day or by night,", "Waking or sleeping, Thy presence my light."] },
    { label: "V2", type: "Verse", lines: ["Be Thou my Wisdom, and Thou my true Word;", "I ever with Thee and Thou with me, Lord;", "Thou my great Father, I Thy true son;", "Thou in me dwelling, and I with Thee one."] } ] },
  { id: "s4", title: "Holy, Holy, Holy", author: "Reginald Heber, John Dykes", ccli: "1156", key: "D", bpm: 92, last: "Jul 20", uses: 2, pd: true, seq: ["V1"], sections: [
    { label: "V1", type: "Verse", lines: ["Holy, holy, holy! Lord God Almighty!", "Early in the morning our song shall rise to Thee;", "Holy, holy, holy, merciful and mighty!", "God in three Persons, blessed Trinity!"] } ] },
  { id: "s5", title: "Great Are You Lord", author: "All Sons & Daughters", ccli: "6460220", key: "G", bpm: 72, last: "Sep 28", uses: 9, pd: false, seq: ["V1", "C", "V2", "C", "B", "C"], sections: [{ label: "V1", type: "Verse", n: 4 }, { label: "C", type: "Chorus", n: 4 }, { label: "V2", type: "Verse", n: 4 }, { label: "B", type: "Bridge", n: 2 }] },
  { id: "s6", title: "Build My Life", author: "Housefires", ccli: "7070345", key: "C", bpm: 68, last: "Sep 28", uses: 8, pd: false, seq: ["V1", "C", "V2", "C", "B", "B", "C"], sections: [{ label: "V1", type: "Verse", n: 4 }, { label: "C", type: "Chorus", n: 4 }, { label: "V2", type: "Verse", n: 4 }, { label: "B", type: "Bridge", n: 4 }] },
  { id: "s7", title: "Goodness of God", author: "Bethel Music", ccli: "7117726", key: "A", bpm: 63, last: "Sep 21", uses: 7, pd: false, seq: ["V1", "C", "V2", "C", "B", "C"], sections: [{ label: "V1", type: "Verse", n: 4 }, { label: "C", type: "Chorus", n: 4 }, { label: "V2", type: "Verse", n: 4 }, { label: "B", type: "Bridge", n: 4 }] },
];

export const rooms = [
  { id: "nursery", name: "Nursery", ages: "0–2", hue: hue("teal"), capacity: 10, ratio: "1:3" },
  { id: "preschool", name: "Preschool", ages: "3–5", hue: hue("amber"), capacity: 16, ratio: "1:6" },
  { id: "k3", name: "Kids 1–3", ages: "Grades 1–3", hue: hue("fern"), capacity: 24, ratio: "1:8" },
  { id: "k6", name: "Kids 4–6", ages: "Grades 4–6", hue: hue("violet"), capacity: 24, ratio: "1:10" },
];

export const children = [
  { id: "c1", name: "Ava Carter", age: 4, code: "KX47", family: "Carter", room: "preschool", allergy: null },
  { id: "c2", name: "Theo Carter", age: 7, code: "KX47", family: "Carter", room: "k3", allergy: null },
  { id: "c3", name: "Leo Park", age: 2, code: "RM19", family: "Park", room: "nursery", allergy: "Peanuts" },
  { id: "c4", name: "Mia Lindqvist", age: 9, code: "QF82", family: "Lindqvist", room: "k6", allergy: null },
  { id: "c5", name: "Noah Mensah", age: 5, code: "LP63", family: "Mensah", room: "preschool", allergy: null },
  { id: "c6", name: "Zara Miller", age: 6, code: "TY05", family: "Miller", room: null, allergy: "Dairy" },
  { id: "c7", name: "Eli Thompson", age: 3, code: "WB31", family: "Thompson", room: null, allergy: null },
  { id: "c8", name: "Sofia Herrera", age: 1, code: "NC74", family: "Herrera", room: null, allergy: null },
];

export const funds = [
  { name: "General", hue: hue("indigo"), month: 28400, ytd: 262100, pct: 74 },
  { name: "Building", hue: hue("amber"), month: 6200, ytd: 58900, pct: 16 },
  { name: "Missions", hue: hue("teal"), month: 2900, ytd: 27400, pct: 8 },
  { name: "Benevolence", hue: hue("rose"), month: 920, ytd: 8100, pct: 2 },
];

export const donations = [
  { who: "Maria & James Carter", fund: "General", amount: "250.00", method: "Online", date: "Sep 28" },
  { who: "Priya Raman", fund: "Building", amount: "1,000.00", method: "Cheque", date: "Sep 28" },
  { who: "Anonymous", fund: "Benevolence", amount: "120.00", method: "Cash", date: "Sep 28" },
  { who: "Samuel Mensah", fund: "General", amount: "80.00", method: "Online", date: "Sep 27" },
  { who: "Tomás Herrera", fund: "Missions", amount: "200.00", method: "Online", date: "Sep 26" },
  { who: "Ruth Bennett", fund: "General", amount: "150.00", method: "Online", date: "Sep 25" },
];

export const ministries = {
  worship: { name: "Worship", hue: hue("violet") },
  kids: { name: "Kids", hue: hue("amber") },
  groups: { name: "Groups", hue: hue("fern") },
  outreach: { name: "Outreach", hue: hue("teal") },
  facility: { name: "Facility", hue: hue("sky") },
};

export const events = [
  { id: "e1", title: "Worship rehearsal", day: 4, time: "7:00 pm", min: ministries.worship, room: "Sanctuary" },
  { id: "e2", title: "Wednesday Women", day: 3, time: "9:30 am", min: ministries.groups, room: "Room 2" },
  { id: "e3", title: "Men's breakfast", day: 6, time: "8:00 am", min: ministries.groups, room: "Fellowship hall" },
  { id: "e4", title: "Food pantry", day: 2, time: "10:00 am", min: ministries.outreach, room: "Lobby" },
  { id: "e5", title: "Kids volunteer training", day: 6, time: "10:30 am", min: ministries.kids, room: "Kids wing" },
  { id: "e6", title: "Alpha course", day: 1, time: "7:00 pm", min: ministries.groups, room: "Room 1" },
  { id: "e7", title: "Sunday service", day: 0, time: "10:00 am", min: ministries.worship, room: "Sanctuary" },
  { id: "e8", title: "Boiler inspection", day: 2, time: "2:00 pm", min: ministries.facility, room: "Basement" },
  { id: "e9", title: "Young adults", day: 5, time: "7:30 pm", min: ministries.groups, room: "Fellowship hall" },
];

export const groups = [
  { id: "g1", name: "Wednesday Women", type: "Small group", hue: hue("fern"), leader: "Maria Carter", members: 14, meets: "Wednesdays, 9:30 am", attendance: 82 },
  { id: "g2", name: "Men's breakfast", type: "Small group", hue: hue("fern"), leader: "James Carter", members: 11, meets: "Saturdays, 8:00 am", attendance: 71 },
  { id: "g3", name: "Alpha course", type: "Class", hue: hue("sky"), leader: "Daniel Park", members: 9, meets: "Mondays, 7:00 pm", attendance: 94 },
  { id: "g4", name: "Young adults", type: "Small group", hue: hue("fern"), leader: "Samuel Mensah", members: 22, meets: "Fridays, 7:30 pm", attendance: 65 },
  { id: "g5", name: "Worship team", type: "Ministry team", hue: hue("violet"), leader: "Tomás Herrera", members: 12, meets: "Thursdays, 7:00 pm", attendance: 88 },
  { id: "g6", name: "Finance committee", type: "Committee", hue: hue("amber"), leader: "Priya Raman", members: 5, meets: "1st Tuesday", attendance: 100 },
];

export const reports = [
  { name: "First-time visitor funnel", group: "People", last: "Today" },
  { name: "Attendance by service", group: "Attendance", last: "Sunday" },
  { name: "Absent 3+ weeks", group: "Attendance", last: "Sunday" },
  { name: "Giving by fund", group: "Giving", last: "Yesterday" },
  { name: "Year-end statements", group: "Giving", last: "Jan 2026" },
  { name: "Pledge progress", group: "Giving", last: "Yesterday" },
  { name: "Group health", group: "Groups", last: "Last week" },
  { name: "Volunteer coverage", group: "Serving", last: "Thursday" },
  { name: "Birthdays this month", group: "People", last: "Today" },
  { name: "Check-in incidents", group: "Check-in", last: "Sunday" },
];

export const plan = [
  { id: "p1", type: "Welcome", title: "Welcome and call to worship", who: "Pastor Mike", min: 3 },
  { id: "p2", type: "Song", title: "Great Are You Lord", who: "Worship team · Key G", min: 5 },
  { id: "p3", type: "Song", title: "Build My Life", who: "Worship team · Key C", min: 6 },
  { id: "p4", type: "Prayer", title: "Prayers of the people", who: "Ruth Bennett", min: 4 },
  { id: "p5", type: "Announcements", title: "Food pantry, Alpha, kids training", who: "Hannah Lindqvist", min: 4 },
  { id: "p6", type: "Offering", title: "Offering · Building fund focus", who: "Ushers", min: 4 },
  { id: "p7", type: "Scripture", title: "Luke 15:11–32", who: "Daniel Park", min: 3 },
  { id: "p8", type: "Sermon", title: "The father who runs", who: "Pastor Mike", min: 30 },
  { id: "p9", type: "Song", title: "Goodness of God", who: "Worship team · Key A", min: 6 },
  { id: "p10", type: "Benediction", title: "Blessing and sending", who: "Pastor Mike", min: 2 },
];
export const planTypeHue = { Song: "violet", Scripture: "sky", Sermon: "indigo", Prayer: "teal", Offering: "amber", Announcements: "citron", Welcome: "fern", Benediction: "fern" };
export const groupMembers = ["Maria Carter", "Priya Raman", "Ruth Bennett", "Hannah Lindqvist", "Lena Fischer", "Abigail Osei", "Sarah Kim", "Naomi Adler", "Joy Mbeki", "Esther Lund", "Rachel Ortiz", "Chloe Baptiste", "Deborah Hale", "Miriam Castro"];

export const attendanceWeeks = [184, 196, 178, 201, 189, 212, 207, 198, 215, 221, 209, 212];
export const visitorFunnel = [{ s: "Visited", n: 48 }, { s: "Contacted", n: 41 }, { s: "Returned", n: 27 }, { s: "Joined a group", n: 14 }, { s: "Member", n: 9 }];
export const followups = [
  { id: "f1", who: "Grace Miller", why: "First visit · Sep 28", stage: "new", owner: "Hannah L." },
  { id: "f2", who: "Elijah Thompson", why: "First visit · Sep 28", stage: "new", owner: "—" },
  { id: "f3", who: "Daniel Park", why: "Asked about baptism", stage: "contacted", owner: "Pastor Mike" },
  { id: "f4", who: "Lena Fischer", why: "Second visit · Sep 21", stage: "contacted", owner: "Hannah L." },
  { id: "f5", who: "Kwame Boateng", why: "Absent 4 weeks", stage: "scheduled", owner: "Maria O." },
  { id: "f6", who: "Chen family", why: "New to area · Sep 14", stage: "done", owner: "Pastor Mike" },
];
