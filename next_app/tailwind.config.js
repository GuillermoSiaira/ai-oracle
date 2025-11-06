module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Merriweather', 'serif']
      },
      backgroundImage: {
        'cosmic': "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.03), transparent 20%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.02), transparent 20%), linear-gradient(180deg, #050814 0%, #0b1020 100%)"
      }
    }
  },
  plugins: [],
}
