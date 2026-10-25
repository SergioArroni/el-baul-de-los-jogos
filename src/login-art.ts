// The login's left side, with the landing's look: the card fan and the title rising
// word by word. The login logic itself stays in login.html.
import { mount } from 'svelte';
import CardFan from './components/CardFan.svelte';
import { splitReveal } from './motion/scroll';

const fan = document.getElementById('loginFan');
// On phones the story panel is a short banner: no room for the fan there.
if (fan && matchMedia('(min-width: 741px)').matches) {
  mount(CardFan, { target: fan, props: { width: 118, slugs: ['hanabi', 'azul', 'carcassonne', 'mysterium', 'sushi-go'] } });
}
const title = document.querySelector<HTMLElement>('.story h1');
if (title) splitReveal(title);
