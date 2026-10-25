// The OAuth consent page (/oauth/consent), with the same look as the landing.
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/fraunces/600.css';
import { mount } from 'svelte';
import Consent from './Consent.svelte';

mount(Consent, { target: document.getElementById('consent')! });
