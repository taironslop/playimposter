export const WORD_CATEGORIES = {
  'Videojuegos': [
    'Minecraft',
    'Fortnite',
    'Mario Bros',
    'Tetris',
    'GTA',
    'FIFA',
    'Call of Duty',
    'Pokemon',
    'Zelda',
    'Among Us'
  ],
  'Lugares': [
    'Hospital',
    'Playa',
    'Aeropuerto',
    'Biblioteca',
    'Supermercado',
    'Cine',
    'Gimnasio',
    'Restaurante',
    'Escuela',
    'Parque'
  ],
  'Comidas': [
    'Pizza',
    'Hamburguesa',
    'Sushi',
    'Tacos',
    'Pasta',
    'Ensalada',
    'Helado',
    'Paella',
    'Asado',
    'Empanadas'
  ],
  'Animales': [
    'Elefante',
    'Delfín',
    'Águila',
    'Serpiente',
    'León',
    'Pingüino',
    'Tiburón',
    'Mariposa',
    'Cocodrilo',
    'Caballo'
  ],
  'Profesiones': [
    'Médico',
    'Bombero',
    'Astronauta',
    'Chef',
    'Piloto',
    'Detective',
    'Arquitecto',
    'Veterinario',
    'Periodista',
    'Músico'
  ],
  'Paises':[
    "Francia",
    "España",
    "Estados Unidos",
    "Italia",
    "Japón",
    "China",
    "México",
    "Reino Unido",
    "Alemania",
    "Chile",
    "Colombia",
    "Perú",
    "Brasil",
    "Tailandia",
    "India",
    "Portugal",
    "Argentina"],

  'Películas': [
    'Titanic',
    'Avatar',
    'Matrix',
    'Jurassic Park',
    'Star Wars',
    'Harry Potter',
    'El Padrino',
    'Toy Story',
    'Frozen',
    'Batman'
  ]
};

export const getRandomCategory = () => {
  const categories = Object.keys(WORD_CATEGORIES);
  return categories[Math.floor(Math.random() * categories.length)];
};

export const getRandomWord = (category) => {
  const words = WORD_CATEGORIES[category];
  return words[Math.floor(Math.random() * words.length)];
};

export const getRandomWordAndCategory = () => {
  const category = getRandomCategory();
  const word = getRandomWord(category);
  return { category, word };
};
