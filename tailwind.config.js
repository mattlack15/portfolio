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
                primary: '#f59e0b',
                secondary: '#ec4899',
                accent: '#193d9e',
                neutral: '#777777',
                background: '#1f2937',
                onBackground: '#f3f4f6',
                surface: '#10202D',
            }
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
}
