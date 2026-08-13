
import { createContext, useContext, useState } from "react";

const MyContext = createContext();

export const MyProvider = ({ children }) => {
  const [results, setResults] = useState([]);
  

  return (
    <MyContext.Provider value={{ results, setResults, }}>
      {children}
    </MyContext.Provider>
  );
};

export const useMyContext = () => useContext(MyContext);
