/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf5ec',
        paperWarm: '#fef3c7',
        ink: {
          DEFAULT: '#2a1f15',
          2: '#6a5340',
          3: '#8a7560',
          4: '#b8a78f',
        },
        accent: {
          DEFAULT: '#c14d2e',
          2: '#f5d97a',
          3: '#4a7eb8',
          4: '#6ba368',
        },
        chip: {
          blue: '#c8d8e8',
          green: '#d4e8d0',
          pink: '#f5c8b8',
          cream: '#fef3c7',
        },
      },
      fontFamily: {
        cn: ['"LXGW WenKai TC"', '"PingFang SC"', '"Noto Sans SC"', 'sans-serif'],
        hand: ['"Patrick Hand"', '"Caveat"', 'cursive'],
        handBold: ['Kalam', 'cursive'],
        display: ['"LXGW WenKai TC"', 'Caveat', 'cursive'],
      },
      boxShadow: {
        brutal: '4px 4px 0 #2a1f15',
        'brutal-sm': '2px 2px 0 #2a1f15',
        'brutal-red': '3px 4px 0 #c14d2e',
        'brutal-light': '2px 3px 0 rgba(42,31,21,0.12)',
      },
      borderRadius: {
        soft: '14px',
        thick: '12px',
      },
    },
  },
  plugins: [],
};
