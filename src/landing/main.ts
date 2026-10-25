// The public landing (/inicio). Same fonts, tokens and motion as the app.
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/800.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import { inject } from '@vercel/analytics';
import { mount } from 'svelte';
import Landing from './Landing.svelte';

inject();
mount(Landing, { target: document.getElementById('landing')! });
