/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fafaf6',
        ink: {
          DEFAULT: '#1a1a1a',
          2: '#4a4a4a',
          3: '#888888',
        },
        accent: {
          DEFAULT: '#d94a3a',
          2: '#f4c542',
          3: '#4a7eb8',
          4: '#6ba368',
        },
        chip: {
          blue: '#d4e4f4',
          green: '#d4e8d0',
          pink: '#f4d4d0',
          cream: '#fff8e6',
        },
      },
      fontFamily: {
        hand: ['"Patrick Hand"', '"Caveat"', 'cursive'],
        handBold: ['Kalam', 'cursive'],
        display: ['Caveat', 'cursive'],
        cn: ['"PingFang SC"', '"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0 #1a1a1a',
        'brutal-sm': '2px 2px 0 #1a1a1a',
      },
      borderRadius: {
        soft: '14px',
        thick: '10px',
      },
    },
  },
  plugins: [],
};
