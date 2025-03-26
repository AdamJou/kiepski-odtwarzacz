# Kiepski Odtwarzacz

Odtwarzacz odcinków serialu "Świat według Kiepskich" z funkcją przycinania fragmentów.

## Funkcjonalności

- Odtwarzanie odcinków z playlisty
- Przycinanie fragmentów wideo
- Pobieranie przyciętych fragmentów
- Interfejs dostosowany do urządzeń mobilnych

## Technologie

- Nuxt 3
- Vue 3
- Tailwind CSS
- FFmpeg (przez WebAssembly)

## Instalacja

```bash
# Klonowanie repozytorium
git clone <adres-repo>
cd kiepski-odtwarzacz

# Instalacja zależności
npm install

# Uruchomienie serwera deweloperskiego
npm run dev
```

## Testowanie

Aplikacja zawiera testy komponentów przy użyciu Vitest:

```bash
# Uruchomienie testów
npm test

# Uruchomienie testów w trybie watch
npm run test:watch

# Uruchomienie testów z pokryciem kodu
npm run test:coverage
```

## Budowanie do produkcji

```bash
# Generowanie statycznej wersji (dla hostingów statycznych)
npm run generate

# Lub standardowy build serwerowy
npm run build
```

## Uwagi

- Funkcja przycinania wideo działa w przeglądarce dzięki FFmpeg skompilowanym do WebAssembly
