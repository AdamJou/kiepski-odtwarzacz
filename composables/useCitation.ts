export const useCitation = () => {
  const cytaty = [
    { cytat: "Co ty za pawiana świrujesz?" },
    { cytat: "Kto ma zmieniarkę, ten ma władzę." },
    {
      cytat:
        "Babę to w byle co ubrać, byleby z Paryża było, a będzie zadowolona.",
    },
    { cytat: "Bycie magistrem a bycie mądrym, to dwie różne rzeczy." },
    {
      cytat: "Dziwne to jest gówno, jak nie śmierdzi.",
      source: "Odcinek 160, 'Zbrodnia i kara'",
    },
    { cytat: "Zgoda scala, a niezgoda rozpierdala." },
    { cytat: "Zakończmy tę wojnę polską z Polską." },
    {
      cytat:
        "Odwłok muchy, dwa patyki, ogon żubra, trzy papryki, płetwa rybia, łój z indora, jedna mysza, ale spora. Dodaj octu, arszeniku i zamieszaj to w nocniku.",
    },
    {
      cytat:
        "Po moim trupie! Nikt Matki Boskiej Kiepskiej nie będzie namydlać!",
      source: "Odcinek 2, 'Wiara czyni cuda'",
    },
    { cytat: "Prostata! Precz z komuną! Niech żyje Koziołek Matołek!" },
    {
      cytat: "Uderz w stół, a nożyce się odwdzięczą.",
      źródło: "Odcinek 85, 'Druga młodość'",
    },
    {
      cytat:
        "Wina, wina, wina dajcie, a jak umrę pochowajcie, w pięknym grobie na cmentarzu w pięknej sukni w balijażu.",
    },
    {
      cytat:
        "Babka niech siedzi cicho, bo ją zamknę do szafy na trzy zdrowaśki!",
    },
    { cytat: "Panie, jak Boga kocham!" },
    { cytat: "Idę na górę oglądnąć mongolski balet w telewizji." },
    { cytat: "Nie, no, panie Ferdku, pan cienki nie jesteś, w mordę jeża." },
    { cytat: "O, w mordę jeża!" },
    { cytat: "O, w dupę węża!" },
    { cytat: "Nie obrażaj pan, dobre?" },
    { cytat: "Moje ulubiene!" },
    {
      cytat:
        "Ja se idę do siebie i se usmażę kiszeczki na tłuszczyku, tłuściutko tak jak lubię.",
    },
    {
      cytat:
        "Ja żem sam zbierał, tam koło przystanku, gdzie te zamknięte szalety miejskie są.",
    },
    {
      cytat:
        "Śpię se spokojnie, a tu nagle sru! Panie lecę do kuchni, a tam mi się lodówa rozdupcyła!",
    },
    { cytat: "Oddaj mi Koziołka Matołka, kanalio!" },
    { cytat: "Oddawaj mi moją rentę, kanalio!" },
    { cytat: "Oddaj mi moje sto milionów, kanalio!" },
    { cytat: "Oddawaj mi zmieniarkę, kanalio!" },
    {
      cytat: "Całe twoje życie zaczyna się i kończy pod kiblem!",
      source: "Odcinek 205, 'Afera kryminalna'",
    },
    {
      cytat: "Kup se sznurek albo odkręć kurek.",
      source: "Odcinek 195, 'Galareta społeczna'",
    },
    {
      cytat:
        "Po 25 latach małżeństwa ja się dowiaduję, że mój własny mąż, mój mąż jest homogejem!",
      source: "Odcinek 148, 'Telejajka'",
    },
    { cytat: "Helena, mam zawał!!!" },
    { cytat: "Tak dalej być nie będzie." },
    { cytat: "Pan jeszcze wielu rzeczy o mnie nie wiesz." },
    {
      cytat: "Czego pan chcesz i kiedy pan oddasz.",
      source: "Odcinek 61, 'Genialny Szopen'",
    },
    { cytat: "Pan się naśmiewasz z moich dziedzicznych obstrukcji!" },
    { cytat: "Tato, weź się nie ośmieszaj." },
    { cytat: "Bo ja w ogóle nie wiem, co wy robicie z tym życiem!" },
    { cytat: "Tata, ale ja jestem niepełnoletni!" },
    { cytat: "Normalnie, jakbyśmy grali w jakimś filmie, nie?" },
    { cytat: "Marian, ty świnio!" },
    { cytat: "Jak ja cię nienawidzę, Marian!" },
    { cytat: "Panie Ferdku, list polecony!" },
    { cytat: "A Paździoch se kupił mercedesa." },
    { cytat: "Bum, cyk, cyk!" },
    { cytat: "Cim-ci-rym-cim, dałabym-cim-ci." },
  ];

  const getRandomCitation = () => {
    return cytaty[Math.floor(Math.random() * cytaty.length)];
  };

  return { getRandomCitation };
};
