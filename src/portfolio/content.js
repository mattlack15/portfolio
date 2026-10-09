import snapshot from './projects.json';
import {API_BASE} from '@/auth/api';

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

export function prepareProjects(data, live = false) {
  return [...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)).map(p => {
    const saved = snapshot.find(item => item.id === p.id);
    return {
      ...p,
      technologies: p.technologies || [],
      description: p.description || '',
      image: live ? (p.imageId === saved?.imageId ? saved?.image : p.imageId ? `${API_BASE}/api/images/${p.imageId}` : null) : p.image,
      category: notes[p.id]?.[0] || 'Other',
      name: p.title === saved?.title ? notes[p.id]?.[1] || p.title : p.title,
      summary: p.brief === saved?.brief ? notes[p.id]?.[2] || p.brief : p.brief,
    };
  });
}
export const projects = prepareProjects(snapshot);
export const categories = ['All', 'Hardware', 'Systems', 'Web', 'Mobile', 'Games', 'Graphics'];
export const projectLink = id => `/project/${id}`;
