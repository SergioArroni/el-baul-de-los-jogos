// Fills the legal pages with the contact details from one place (src/content/legal.ts).
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/fraunces/600.css';
import { CONTACT_EMAIL, DATA_CONTROLLER } from './content/legal';

for (const node of document.querySelectorAll<HTMLElement>('[data-controller]')) node.textContent = DATA_CONTROLLER;
if (CONTACT_EMAIL) {
  for (const node of document.querySelectorAll<HTMLElement>('[data-contact]')) {
    const link = document.createElement('a');
    link.href = 'mailto:' + CONTACT_EMAIL;
    link.textContent = CONTACT_EMAIL;
    node.replaceWith(link);
  }
}
