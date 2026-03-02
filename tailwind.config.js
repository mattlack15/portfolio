import typography from '@tailwindcss/typography';

export default {
    content: [
        './index.html',
        './src/**/*.{vue,js,jsx,ts,tsx}',
        // './**/*.{vue,js,jsx,ts,tsx}',   // 👈  scan every folder, root included

    ],
    darkMode: 'media', // or 'media' or 'class'
    theme: {
        extend: {
            colors: {
                primary: '#e5e5e5',
                secondary: '#9ca3af',
                accent: '#404040',
                neutral: '#6b7280',
                background: '#0a0a0a',
                onBackground: '#f5f5f5',
                surface: '#1a1a1a',
            }
        },
    },
    variants: {
        extend: {},
    },
    plugins: [typography]}
