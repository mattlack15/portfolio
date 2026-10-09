import snapshot from './projects.json';

const notes = {
  '1785866116116': ['Hardware', 'Reverse engineering an iPhone X display', "An ongoing attempt to control an iPhone X display with an RP2350. So far, I've built a logic analyzer and an interposer board to record the phone's display signals."],
  '1772491993559': ['Web', 'Belfort Events', "An event and ticketing platform for my cousin's nightclub, with payments, door scanning, promo codes, and analytics."],
  '1748549972604': ['Systems', 'MidnightSky', 'A Minecraft network I built and ran as a business. Its game servers communicate through a custom RPC layer, coordinated by a central service.'],
  '1748545289816': ['Systems', 'KAsyncWorld', 'A Kotlin library for editing Minecraft worlds asynchronously, with support for in-memory worlds and fast serialization.'],
  '1758075222873': ['Web', 'FinHog', 'A data analytics platform built with friends at HackMIT 2025. We won the Anthropic first-place and Warp second-place sponsor prizes.'],
  '1748550292555': ['Web', 'Clarify', 'A lecture transcription app built at GenAI2025. I worked on the Flask backend, PostgreSQL database, and Gemini integration.'],
  '1748550590169': ['Games', 'Seascript', 'A game for learning MATLAB, made with Python and PyGame at HackThe6ix 2024.'],
  '1748550274169': ['Mobile', 'Wordle for Android', 'An Android Wordle app written in Kotlin with Jetpack Compose, backed by a Ktor API.'],
  '1748550548422': ['Games', 'RPG Game', 'A Java game built without external libraries for my high-school computer science class. Mariana Cuan Celis made the artwork.'],
  '1748550604870': ['Hardware', 'Pico threads', 'A threading library for the Raspberry Pi Pico, with context switching and synchronization primitives.'],
  '1748550695320': ['Graphics', 'Marching Squares', 'A Kotlin implementation of marching squares for rendering two-dimensional curves.'],
  '1748550728354': ['Systems', 'NeuralNetLib', 'A small Java library for building and training dense neural networks with backpropagation and Adam.'],
  '1748550947535': ['Systems', 'Midnight Commands', 'A library for defining Minecraft commands.'],
  '1748551014404': ['Systems', 'Fluid Gui', 'A library for building Minecraft menus.'],
  '1748718850780': ['Systems', 'Permissions Plugin', 'A Minecraft plugin for managing player and group permission hierarchies.'],
  '1748719643348': ['Games', 'Bedwars Clone', 'My version of the Bedwars minigame, written in Java in 2020.'],
  '1748838882885': ['Systems', 'Proximal Policy Optimization', 'A Java implementation of the PPO algorithm.'],
};

export const projects = snapshot.sort((a, b) => a.orderIndex - b.orderIndex).map(p => ({
  ...p, category: notes[p.id]?.[0] || 'Software',
  name: notes[p.id]?.[1] || p.title, summary: notes[p.id]?.[2] || p.brief,
}));
export const categories = ['All', 'Hardware', 'Systems', 'Web', 'Mobile', 'Games', 'Graphics'];
export const bio = "I'm a software developer in Toronto, studying Computer Science and Mathematics at the University of Toronto. My dad introduced me to programming, and I got started by making Minecraft plugins. Since then, I've built web applications, Android apps, game servers, and a few things that run on microcontrollers.";
export const directions = [
  {id: 'editorial', number: '01', name: 'First design', short: 'The first layout, revised with plain typography and wording.', description: 'Keeps the first layout, with a system font, direct headings, and no decorative rules or accent highlights. The project arrangement and page order stay the same.', changes: ['System font throughout', 'Direct headings in place of slogans', 'Decorative rules and color accents removed'], tradeoff: 'Keeps the layout you liked, with simpler typography and wording.', color: '#a44128'},
  {id: 'workbench', number: '02', name: 'Workbench', short: 'A browsable workspace for your projects.', description: 'A dark, fixed-sidebar layout with a project explorer and an inspection pane. Visitors can switch between projects, inspect their stack, and open the full writeup.', changes: ['An interactive project explorer', 'Technical details in a split view', 'Hardware, systems, and web filters'], tradeoff: 'Best for technical visitors; the denser interface takes more attention.', color: '#b5d6aa'},
  {id: 'gallery', number: '03', name: 'Gallery', short: 'Large images and a bolder first impression.', description: 'A blue masthead and an asymmetric gallery built around real project screenshots. Each image keeps its own context, with restrained captions and direct links to the work.', changes: ['A full-width typographic introduction', 'Large, varied project image layouts', 'Project types used as navigation'], tradeoff: 'Best for browsing visually; relies more on the quality of project images.', color: '#2146cf'},
  {id: 'index', number: '04', name: 'Personal Index', short: 'A small, direct home on the web.', description: 'A compact personal introduction, followed by a searchable project index. It keeps the emphasis on what you have made and makes the entire collection easy to scan.', changes: ['A short personal introduction', 'A searchable, expandable project index', 'Small images and minimal decoration'], tradeoff: 'Best for fast scanning; has a quieter first impression.', color: '#263d33'},
];

export const projectLink = (direction, id) => `/designs/${direction}/project/${id}`;
