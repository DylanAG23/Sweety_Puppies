const DOG_BREEDS = [
  { label: 'Affenpinscher' },
  { label: 'Akita' },
  { label: 'Alaskan Malamute' },
  { label: 'American Bully' },
  { label: 'American Pit Bull Terrier', aliases: ['pitbull', 'pit bull', 'pit bull terrier'] },
  { label: 'Basenji' },
  { label: 'Basset Hound' },
  { label: 'Beagle' },
  { label: 'Bernese Mountain Dog' },
  { label: 'Bichon Frise', aliases: ['bichon frise'] },
  { label: 'Border Collie' },
  { label: 'Boston Terrier' },
  { label: 'Boxer' },
  { label: 'Bulldog Frances', aliases: ['bulldog frances', 'french bulldog'] },
  { label: 'Bulldog Ingles', aliases: ['bulldog ingles', 'english bulldog'] },
  { label: 'Bull Terrier' },
  { label: 'Cane Corso' },
  { label: 'Caniche', aliases: ['poodle', 'toy poodle', 'mini poodle'] },
  { label: 'Cavalier King Charles Spaniel' },
  { label: 'Chihuahua' },
  { label: 'Chow Chow' },
  { label: 'Cocker Spaniel' },
  { label: 'Collie' },
  { label: 'Criollo', aliases: ['mestizo', 'sin raza', 'mezcla', 'criollo colombiano'] },
  { label: 'Dachshund', aliases: ['salchicha', 'teckel'] },
  { label: 'Dalmata', aliases: ['dalmata'] },
  { label: 'Doberman' },
  { label: 'Dogo Argentino' },
  { label: 'French Poodle', aliases: ['french poodle'] },
  { label: 'German Shepherd', aliases: ['pastor aleman', 'german shepard'] },
  { label: 'Golden Retriever' },
  { label: 'Great Dane', aliases: ['gran danes'] },
  { label: 'Greyhound' },
  { label: 'Husky Siberiano', aliases: ['husky siberiano', 'siberian husky', 'husky'] },
  { label: 'Jack Russell Terrier' },
  { label: 'Labrador Retriever', aliases: ['labrador'] },
  { label: 'Lhasa Apso' },
  { label: 'Maltese', aliases: ['maltes'] },
  { label: 'Mastin Napolitano', aliases: ['mastin napolitano'] },
  { label: 'Miniature Schnauzer', aliases: ['schnauzer miniatura', 'mini schnauzer'] },
  { label: 'Pastor Belga' },
  { label: 'Pastor Australiano' },
  { label: 'Pekingese', aliases: ['pequines'] },
  { label: 'Pomerania', aliases: ['pomeranian', 'spitz enano'] },
  { label: 'Pug' },
  { label: 'Rottweiler' },
  { label: 'Samoyed' },
  { label: 'San Bernardo', aliases: ['saint bernard'] },
  { label: 'Schnauzer' },
  { label: 'Shar Pei', aliases: ['sharpei'] },
  { label: 'Shiba Inu' },
  { label: 'Shih Tzu', aliases: ['shitzu', 'shit zu', 'shihtzu', 'shi tzu'] },
  { label: 'Weimaraner' },
  { label: 'West Highland White Terrier', aliases: ['westy', 'west highland'] },
  { label: 'Whippet' },
  { label: 'Yorkshire Terrier', aliases: ['yorkie', 'yorkshire'] }
];

function normalizeCatalogText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const BREED_OPTIONS = DOG_BREEDS.map((breed) => ({
  value: breed.label,
  label: breed.label,
  aliases: Array.isArray(breed.aliases) ? breed.aliases : []
}));

const BREED_INDEX = new Map();

for (const breed of BREED_OPTIONS) {
  BREED_INDEX.set(normalizeCatalogText(breed.value), breed.value);
  BREED_INDEX.set(normalizeCatalogText(breed.label), breed.value);

  for (const alias of breed.aliases) {
    BREED_INDEX.set(normalizeCatalogText(alias), breed.value);
  }
}

function resolveDogBreed(value) {
  const normalizedValue = normalizeCatalogText(value);

  if (!normalizedValue) {
    return null;
  }

  return BREED_INDEX.get(normalizedValue) || null;
}

function listDogBreedCatalog() {
  return BREED_OPTIONS.map((breed) => ({
    value: breed.value,
    label: breed.label,
    aliases: [...breed.aliases]
  }));
}

module.exports = {
  listDogBreedCatalog,
  normalizeCatalogText,
  resolveDogBreed
};
