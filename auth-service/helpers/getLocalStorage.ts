function getLocalStorage(storedItems: string[]): { [key: string]: any } {
  // Retrieves values from a list of keys from localStorage
  const storageArray = storedItems.map((item) => {
    let storedString = localStorage.getItem(item) || undefined;
    let storedObject =
      storedString && storedString !== "undefined"
        ? JSON.parse(storedString)
        : undefined;
    return storedObject;
  });
  let storageObject = {} as { [key: string]: any };
  storageArray.forEach((item, i) => (storageObject[storedItems[i]] = item));
  return storageObject;
}

export { getLocalStorage };
