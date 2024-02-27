import "./App.css";
import { useState, useEffect, useRef } from "react";
import Trash from "./Assets/SVG/Trash.js";
import Alert from "./Components/Alert.js";
const { ipcRenderer } = window.require("electron");

function App() {
  const [selectedNote, setSelectedNote] = useState();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [notes, setNotes] = useState([]);
  const [defaults, setDefault] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [alert, setAlert] = useState({
    message: "",
    type: "info",
    isVisible: false,
  });
  const [isUnsavedChanges, setIsUnsavedChanges] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark"); // default to dark mode
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleCollapse = (id) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
    localStorage.setItem("theme", theme === "dark" ? "light" : "dark");
  };

  const handleNoteTitleChange = (e) => {
    setNoteTitle(e.target.value);
    setIsUnsavedChanges(true);
  };

  const handleNoteContentChange = (e) => {
    setNoteContent(e.target.value);
    setIsUnsavedChanges(true);
  };

  const showAlert = (message, type = "info") => {
    setAlert({ message, type, isVisible: true });
    setTimeout(() => {
      setAlert((prevState) => ({ ...prevState, isVisible: false }));
    }, 3000);
  };

  useEffect(() => {
    const minimizeBtn = document.getElementById("minimize-btn");
    const maximizeBtn = document.getElementById("maximize-btn");
    const closeBtn = document.getElementById("close-btn");

    const minimize = () => {
      ipcRenderer.send("minimize-app");
    };

    const maximize = () => {
      ipcRenderer.send("maximize-app");
    };

    const close = () => {
      ipcRenderer.send("close-app");
    };

    if (minimizeBtn) minimizeBtn.addEventListener("click", minimize);
    if (maximizeBtn) maximizeBtn.addEventListener("click", maximize);
    if (closeBtn) closeBtn.addEventListener("click", close);

    return () => {
      if (minimizeBtn) minimizeBtn.removeEventListener("click", minimize);
      if (maximizeBtn) maximizeBtn.removeEventListener("click", maximize);
      if (closeBtn) closeBtn.removeEventListener("click", close);
    };
  }, []);

  function useAutoResize(textareaRef) {
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const resizeTextarea = () => {
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
        };
        resizeTextarea();
        textarea.addEventListener("input", resizeTextarea);
        return () => textarea.removeEventListener("input", resizeTextarea);
      }
    }, [textareaRef]);
  }

  const textareaRef = useRef(null);
  useAutoResize(textareaRef);

  const handleAddNote = () => {
    setIsUnsavedChanges(false);
    const newNote = {
      id: Date.now(),
      title: noteTitle ? noteTitle : "Untitled",
      content: noteContent,
      lastUpdated: new Date().toLocaleString(),
    };

    const today = new Date().toLocaleDateString();

    const existingEntryIndex = notes.findIndex(
      (section) => section.date === today
    );

    if (existingEntryIndex > -1) {
      const updatedEntry = {
        ...notes[existingEntryIndex],
        data: [newNote, ...notes[existingEntryIndex].data],
      };

      const updatedNotes = [
        ...notes.slice(0, existingEntryIndex),
        updatedEntry,
        ...notes.slice(existingEntryIndex + 1),
      ];

      setNotes(updatedNotes);
      ipcRenderer.send("save-notes", updatedNotes);
      showAlert("Note added successfully", "success");
    } else {
      const newEntry = {
        id: Date.now(),
        date: today,
        data: [newNote],
        lastUpdated: new Date().toLocaleString(),
      };

      const updatedNotes = [...notes, newEntry];
      setNotes(updatedNotes);
      ipcRenderer.send("save-notes", updatedNotes);
    }
    showAlert("Note added successfully", "success");
    setNoteTitle("");
    setNoteContent("");
  };

  const handleUpdateNote = () => {
    setIsUnsavedChanges(false);
    const updatedNotes = notes.map((section) => {
      if (section.data.find((note) => note.id === selectedNote)) {
        return {
          ...section,
          data: section.data.map((note) => {
            if (note.id === selectedNote) {
              return {
                ...note,
                title: noteTitle ? noteTitle : "Untitled",
                content: noteContent,
                lastUpdated: new Date().toLocaleString(),
              };
            }
            setLastUpdated(lastUpdated);
            return note;
          }),
        };
      }
      return section;
    });
    setNotes(updatedNotes);
    ipcRenderer.send("save-notes", updatedNotes);
    showAlert("Note updated successfully", "success");
  };

  const handleDeleteNote = (noteId) => {
    const updatedNotes = notes
      .map((group) => {
        const newData = group.data.filter((note) => note.id !== noteId);
        return { ...group, data: newData };
      })
      .filter((group) => group.data.length > 0);
    setNotes(updatedNotes);
    showAlert("Note deleted successfully", "success");
    ipcRenderer.send("save-notes", updatedNotes);
    resetFormAndShowDefaultView();
  };

  const resetFormAndShowDefaultView = () => {
    setNoteTitle("");
    setNoteContent("");
    setSelectedNote(undefined);
    setDefault(true);
    window.location.reload();
  };

  const addNotebtn = () => {
    setNoteTitle("");
    setNoteContent("");
    setSelectedNote();
    setDefault(false);
    setLastUpdated("");
  };

  useEffect(() => {
    ipcRenderer.send("load-notes");
    ipcRenderer.on("notes-data", (event, loadedNotes) => {
      setNotes(loadedNotes);
    });

    return () => {
      ipcRenderer.removeAllListeners("notes-data");
    };
  }, []);

  const selectNote = (note) => {
    setSelectedNote(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setDefault(false);
    setLastUpdated(note.lastUpdated ? note.lastUpdated : "");
  };

  const DefaultView = () => (
    <div>
      <div
        className={`
      ${
        theme === "dark"
          ? "bg-[#1a1a1a] text-white "
          : "bg-[#deedff] text-black"
      }px-4 py-3 top-0 sticky drag`}
      >
        <div>
          <div
            className={`flex items-center justify-end space-x-2 ${
              theme === "dark" ? "mx-[-15px]" : "px-2"
            }   `}
          >
            <div
              class="bg-yellow-400 hover:bg-yellow-500 rounded-full p-2 cursor-pointer no-drag"
              onClick={() => ipcRenderer.send("minimize-app")}
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18 12H6"
                ></path>
              </svg>
            </div>

            <div
              class="bg-green-500 hover:bg-green-600 rounded-full p-2 cursor-pointer no-drag"
              onClick={() => ipcRenderer.send("maximize-app")}
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 3h6v6m-6 4h6v6m-6-6H9m0-6H3V3h6m0 6V3m0 6v6"
                ></path>
              </svg>
            </div>

            <div
              class="bg-red-500 hover:bg-red-600 rounded-full p-2 cursor-pointer no-drag"
              onClick={() => ipcRenderer.send("close-app")}
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center mt-[-200px]">
          <div className="flex justify-center">
            <svg
              width="100"
              height="120.15214428726775"
              viewBox="0 0 370 112.26336713709361"
              className="looka-1j8o68f animate-pulse"
            >
              <defs id="SvgjsDefs1168"></defs>
              <g
                id="SvgjsG1169"
                featurekey="FRM3ZD-0"
                transform="matrix(10.288064551576898,0,0,10.288064551576898,-0.14403718151991374,-93.49792389444436)"
                fill={`${theme === "dark" ? "#f0fff3" : "#1a1a1a"}`}
              >
                <path d="M10.22 10.06 l-3.08 9.94 l-3.56 0 l-3.08 -9.94 l9.72 0 z"></path>
              </g>
              <g
                id="SvgjsG1170"
                featurekey="vMvB0T-0"
                transform="matrix(4.176411850696081,0,0,4.176411850696081,119.24824359660077,5.774472581113141)"
                fill={`${theme === "dark" ? "#f0fff3" : "#1a1a1a"}`}
              >
                <path d="M6.34 17.32 l2.62 -10.98 q0.48 -0.12 1.24 -0.12 q1.04 0 1.64 0.22 l0.12 0.16 l-3.74 13.4 q-1.14 0.12 -2.29 0.12 t-1.66 -0.29 t-0.77 -1.15 l-3.32 -12.06 q1.08 -0.46 1.78 -0.46 q0.84 0 1.24 0.38 t0.62 1.2 l1.54 5.7 q0.36 1.34 0.76 3.64 q0.04 0.24 0.22 0.24 z M24.4 6.199999999999999 l0.14 0.14 l0 13.6 q-0.8 0.18 -1.89 0.18 t-1.93 -0.12 l-3.14 -7.16 q-0.56 -1.22 -1.14 -2.82 l-0.06 0.02 q0.24 2.92 0.24 5.98 l0 3.98 q-0.62 0.12 -1.5 0.12 t-1.48 -0.12 l0 -13.6 q0.76 -0.18 1.83 -0.18 t1.91 0.12 l3.1 7.14 q0.84 1.98 1.24 3.04 l0.08 -0.04 q-0.24 -2.78 -0.24 -5.9 l0 -2.44 q0 -1.04 0.42 -1.49 t1.36 -0.45 l1.06 0 z M30.52 16.28 q0.54 1.56 2.18 1.56 q0.82 0 1.33 -0.41 t0.8 -1.04 t0.39 -1.41 t0.1 -1.54 q0 -0.7 -0.05 -1.56 t-0.29 -1.61 t-0.76 -1.26 t-1.52 -0.51 q-0.96 0 -1.47 0.49 t-0.76 1.21 t-0.31 1.53 t-0.06 1.43 q0 0.92 0.09 1.64 t0.33 1.48 z M28.9 19.04 q-2.14 -1.78 -2.14 -5.86 q0 -1.76 0.41 -3.09 t1.18 -2.23 t1.87 -1.36 t2.48 -0.46 t2.49 0.46 t1.88 1.37 t1.18 2.24 t0.41 3.07 t-0.41 3.07 t-1.18 2.23 t-1.88 1.36 t-2.49 0.46 q-2.28 0 -3.8 -1.26 z M45.78 8.98 l0.02 1.48 l0 9.54 q-0.68 0.12 -1.62 0.12 t-1.58 -0.12 l0 -11.02 l-1.28 0.02 l-2.06 0 q-0.12 -0.58 -0.12 -1.33 t0.12 -1.33 l9.9 0 q0.16 0.52 0.16 1.26 t-0.4 1.07 t-1.28 0.33 l-0.58 0 l-1.26 -0.02 l-0.02 0 z M53.94 15.96 l-0.02 1.44 l0 0.02 q0.92 -0.04 1.48 -0.04 l4.64 0 q0 0.74 -0.06 1.14 q-0.24 1.54 -2.04 1.54 l-5.32 0 q-0.86 0 -1.35 -0.5 t-0.49 -1.36 l0 -11.72 l0.14 -0.14 l8.62 0 q0.12 0.58 0.12 1.26 t-0.28 1.42 l-5.46 0 l0.02 1.44 l0 1.4 q0.52 -0.02 1.36 -0.02 l3.06 0 q0.18 0.56 0.18 1.28 t-0.18 1.32 l-4.42 0 l0 1.52 z"></path>
              </g>
            </svg>
          </div>
          <p className={`${theme === "dark" ? "text-white" : "text-black"}`}>
            Select a note from the sidebar or create a new one to get started!
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="flex App hide-scrollbar "
        style={{
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {alert.isVisible && <Alert message={alert.message} type={alert.type} />}
        <div
          className={`w-36  ${
            theme === "dark"
              ? "bg-[#1a1a1a] text-white "
              : "bg-[#deedff] text-black"
          } md:w-64 lg:w-96 transition-width duration-500 ease-in-out h-screen min-h-screen overflow-y-auto ${
            theme === "dark" ? "sidebar" : "sidebar-light"
          }`}
        >
          <div
            className={`flex items-center justify-between  h-16  px-2 sticky top-0  ${
              theme === "dark"
                ? "bg-[#1a1a1a] text-white "
                : "bg-[#deedff] text-black"
            }z-10 `}
          >
            <div className="px-2 drag">
              <svg
                width="100"
                height="120.15214428726775"
                viewBox="0 0 370 112.26336713709361"
                class="looka-1j8o68f"
              >
                <defs id="SvgjsDefs1168"></defs>
                <g
                  id="SvgjsG1169"
                  featurekey="FRM3ZD-0"
                  transform="matrix(10.288064551576898,0,0,10.288064551576898,-0.14403718151991374,-93.49792389444436)"
                  fill={`${theme === "dark" ? "#f0fff3" : "#1a1a1a"}`}
                >
                  <path d="M10.22 10.06 l-3.08 9.94 l-3.56 0 l-3.08 -9.94 l9.72 0 z"></path>
                </g>
                <g
                  id="SvgjsG1170"
                  featurekey="vMvB0T-0"
                  transform="matrix(4.176411850696081,0,0,4.176411850696081,119.24824359660077,5.774472581113141)"
                  fill={`${theme === "dark" ? "#f0fff3" : "#1a1a1a"}`}
                >
                  <path d="M6.34 17.32 l2.62 -10.98 q0.48 -0.12 1.24 -0.12 q1.04 0 1.64 0.22 l0.12 0.16 l-3.74 13.4 q-1.14 0.12 -2.29 0.12 t-1.66 -0.29 t-0.77 -1.15 l-3.32 -12.06 q1.08 -0.46 1.78 -0.46 q0.84 0 1.24 0.38 t0.62 1.2 l1.54 5.7 q0.36 1.34 0.76 3.64 q0.04 0.24 0.22 0.24 z M24.4 6.199999999999999 l0.14 0.14 l0 13.6 q-0.8 0.18 -1.89 0.18 t-1.93 -0.12 l-3.14 -7.16 q-0.56 -1.22 -1.14 -2.82 l-0.06 0.02 q0.24 2.92 0.24 5.98 l0 3.98 q-0.62 0.12 -1.5 0.12 t-1.48 -0.12 l0 -13.6 q0.76 -0.18 1.83 -0.18 t1.91 0.12 l3.1 7.14 q0.84 1.98 1.24 3.04 l0.08 -0.04 q-0.24 -2.78 -0.24 -5.9 l0 -2.44 q0 -1.04 0.42 -1.49 t1.36 -0.45 l1.06 0 z M30.52 16.28 q0.54 1.56 2.18 1.56 q0.82 0 1.33 -0.41 t0.8 -1.04 t0.39 -1.41 t0.1 -1.54 q0 -0.7 -0.05 -1.56 t-0.29 -1.61 t-0.76 -1.26 t-1.52 -0.51 q-0.96 0 -1.47 0.49 t-0.76 1.21 t-0.31 1.53 t-0.06 1.43 q0 0.92 0.09 1.64 t0.33 1.48 z M28.9 19.04 q-2.14 -1.78 -2.14 -5.86 q0 -1.76 0.41 -3.09 t1.18 -2.23 t1.87 -1.36 t2.48 -0.46 t2.49 0.46 t1.88 1.37 t1.18 2.24 t0.41 3.07 t-0.41 3.07 t-1.18 2.23 t-1.88 1.36 t-2.49 0.46 q-2.28 0 -3.8 -1.26 z M45.78 8.98 l0.02 1.48 l0 9.54 q-0.68 0.12 -1.62 0.12 t-1.58 -0.12 l0 -11.02 l-1.28 0.02 l-2.06 0 q-0.12 -0.58 -0.12 -1.33 t0.12 -1.33 l9.9 0 q0.16 0.52 0.16 1.26 t-0.4 1.07 t-1.28 0.33 l-0.58 0 l-1.26 -0.02 l-0.02 0 z M53.94 15.96 l-0.02 1.44 l0 0.02 q0.92 -0.04 1.48 -0.04 l4.64 0 q0 0.74 -0.06 1.14 q-0.24 1.54 -2.04 1.54 l-5.32 0 q-0.86 0 -1.35 -0.5 t-0.49 -1.36 l0 -11.72 l0.14 -0.14 l8.62 0 q0.12 0.58 0.12 1.26 t-0.28 1.42 l-5.46 0 l0.02 1.44 l0 1.4 q0.52 -0.02 1.36 -0.02 l3.06 0 q0.18 0.56 0.18 1.28 t-0.18 1.32 l-4.42 0 l0 1.52 z"></path>
                </g>
              </svg>
            </div>

            <button
              onClick={addNotebtn}
              className="inline-flex items-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none"
            >
              <span>Add Note</span>
            </button>
          </div>
          <div className="w-full">
            <nav className="w-full">
              <ul>
                {notes.length > 0 &&
                  notes.map((section) => (
                    <li
                      key={section.id}
                      className="w-full mb-2 transition-opacity duration-500 ease-out cursor-pointer hover:opacity-80"
                    >
                      <div className="flex flex-row items-center justify-between">
                        <p className="flex  px-4 py-2 text-xs text-[#a4a4a4]">
                          {section.date === new Date().toLocaleDateString() ? (
                            <span onClick={() => toggleCollapse(section.id)}>
                              Today
                            </span>
                          ) : section.date ? (
                            section.date
                          ) : (
                            "No Date"
                          )}
                        </p>
                        <div
                          className="items-center justify-center pr-3"
                          onClick={() => toggleCollapse(section.id)}
                        >
                          {collapsedSections[section.id] ? (
                            <svg
                              width="20px"
                              height="20px"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                            >
                              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                              <g
                                id="SVGRepo_tracerCarrier"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              ></g>
                              <g id="SVGRepo_iconCarrier">
                                {" "}
                                <path
                                  fill="#a4a4a4"
                                  fill-rule="evenodd"
                                  d="M10 3a7 7 0 100 14 7 7 0 000-14zm-9 7a9 9 0 1118 0 9 9 0 01-18 0zm14 .069a1 1 0 01-1 1h-2.931V14a1 1 0 11-2 0v-2.931H6a1 1 0 110-2h3.069V6a1 1 0 112 0v3.069H14a1 1 0 011 1z"
                                ></path>{" "}
                              </g>
                            </svg>
                          ) : (
                            <svg
                              width="20px"
                              height="20px"
                              viewBox="0 -0.5 21 21"
                              version="1.1"
                              fill="#000000"
                            >
                              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                              <g
                                id="SVGRepo_tracerCarrier"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              ></g>
                              <g id="SVGRepo_iconCarrier">
                                {" "}
                                <title>minus_circle [#fffafa]</title>{" "}
                                <desc>Created with Sketch.</desc> <defs> </defs>{" "}
                                <g
                                  id="Page-1"
                                  stroke="none"
                                  stroke-width="1"
                                  fill="none"
                                  fill-rule="evenodd"
                                >
                                  {" "}
                                  <g
                                    id="Dribbble-Light-Preview"
                                    transform="translate(-219.000000, -600.000000)"
                                    fill="#a4a4a4"
                                  >
                                    {" "}
                                    <g
                                      id="icons"
                                      transform="translate(56.000000, 160.000000)"
                                    >
                                      {" "}
                                      <path
                                        d="M177.7,450 C177.7,450.552 177.2296,451 176.65,451 L170.35,451 C169.7704,451 169.3,450.552 169.3,450 C169.3,449.448 169.7704,449 170.35,449 L176.65,449 C177.2296,449 177.7,449.448 177.7,450 M173.5,458 C168.86845,458 165.1,454.411 165.1,450 C165.1,445.589 168.86845,442 173.5,442 C178.13155,442 181.9,445.589 181.9,450 C181.9,454.411 178.13155,458 173.5,458 M173.5,440 C167.70085,440 163,444.477 163,450 C163,455.523 167.70085,460 173.5,460 C179.29915,460 184,455.523 184,450 C184,444.477 179.29915,440 173.5,440"
                                        id="minus_circle-[#fffafa]"
                                      >
                                        {" "}
                                      </path>{" "}
                                    </g>{" "}
                                  </g>{" "}
                                </g>{" "}
                              </g>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="transss">
                        {!collapsedSections[section.id] && (
                          <ul className="transss">
                            {section?.data?.map((note) => (
                              <li
                                key={note.id}
                                className={`flex justify-start mb-1  group  ${
                                  selectedNote === note.id ? "pl-2" : "pl-4"
                                } `}
                                onClick={() => {
                                  setSelectedNote(note.id);
                                  selectNote(note);
                                }}
                              >
                                {/* {selectedNote === note.id && ( */}
                                <div
                                  className={`w-1.5  ${
                                    selectedNote === note.id ? "hidden" : ""
                                  }`}
                                ></div>
                                <div className="flex items-center justify-center">
                                  <div
                                    className={`w-1.5 h-8 mr-3 ${
                                      selectedNote === note.id ? "" : "hidden"
                                    }  duration-500 ease-in-out bg-blue-600 rounded-lg transition-width `}
                                  ></div>
                                </div>

                                {/* )} */}
                                <div
                                  className={`flex flex-row w-full py-1 rounded-lg pl-3 mr-3  
                            ${
                              theme === "dark"
                                ? "bg-[#1a1a1a] hover:bg-[#333333]"
                                : "bg-[#deedff] hover:bg-[#7acaff]"
                            }
                           ${
                             selectedNote === note.id && theme === "dark"
                               ? "bg-[#333333]"
                               : ""
                           }
                            ${
                              selectedNote === note.id && theme === "light"
                                ? "bg-[#7acaff]"
                                : ""
                            }
                           
                           `}
                                >
                                  <div className="flex justify-between w-full">
                                    <div className="flex flex-row">
                                      <div className="flex items-center justify-center">
                                        {selectedNote === note.id ? (
                                          <svg
                                            width="25px"
                                            height="25px"
                                            viewBox="-2.4 -2.4 28.80 28.80"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <g
                                              id="SVGRepo_bgCarrier"
                                              stroke-width="0"
                                            >
                                              <rect
                                                x="-2.4"
                                                y="-2.4"
                                                width="28.80"
                                                height="28.80"
                                                rx="7.2"
                                                fill={`${
                                                  theme === "dark"
                                                    ? "#ffff"
                                                    : "#deedff"
                                                }`}
                                                strokewidth="0"
                                              ></rect>
                                            </g>
                                            <g
                                              id="SVGRepo_tracerCarrier"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                            ></g>
                                            <g id="SVGRepo_iconCarrier">
                                              {" "}
                                              <path
                                                d="M21.6601 10.44L20.6801 14.62C19.8401 18.23 18.1801 19.69 15.0601 19.39C14.5601 19.35 14.0201 19.26 13.4401 19.12L11.7601 18.72C7.59006 17.73 6.30006 15.67 7.28006 11.49L8.26006 7.30001C8.46006 6.45001 8.70006 5.71001 9.00006 5.10001C10.1701 2.68001 12.1601 2.03001 15.5001 2.82001L17.1701 3.21001C21.3601 4.19001 22.6401 6.26001 21.6601 10.44Z"
                                                stroke="#292D32"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                              <path
                                                d="M15.06 19.39C14.44 19.81 13.66 20.16 12.71 20.47L11.13 20.99C7.15998 22.27 5.06997 21.2 3.77997 17.23L2.49997 13.28C1.21997 9.30998 2.27997 7.20998 6.24997 5.92998L7.82997 5.40998C8.23997 5.27998 8.62997 5.16998 8.99997 5.09998C8.69997 5.70998 8.45997 6.44998 8.25997 7.29998L7.27997 11.49C6.29997 15.67 7.58998 17.73 11.76 18.72L13.44 19.12C14.02 19.26 14.56 19.35 15.06 19.39Z"
                                                stroke="#292D32"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                              <path
                                                d="M12.64 8.53003L17.49 9.76003"
                                                stroke="#292D32"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                              <path
                                                d="M11.66 12.4L14.56 13.14"
                                                stroke="#292D32"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                            </g>
                                          </svg>
                                        ) : (
                                          <svg
                                            width="25px"
                                            height="25px"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <g
                                              id="SVGRepo_bgCarrier"
                                              stroke-width="0"
                                            ></g>
                                            <g
                                              id="SVGRepo_tracerCarrier"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                            ></g>
                                            <g id="SVGRepo_iconCarrier">
                                              {" "}
                                              <path
                                                d="M21.6601 10.44L20.6801 14.62C19.8401 18.23 18.1801 19.69 15.0601 19.39C14.5601 19.35 14.0201 19.26 13.4401 19.12L11.7601 18.72C7.59006 17.73 6.30006 15.67 7.28006 11.49L8.26006 7.30001C8.46006 6.45001 8.70006 5.71001 9.00006 5.10001C10.1701 2.68001 12.1601 2.03001 15.5001 2.82001L17.1701 3.21001C21.3601 4.19001 22.6401 6.26001 21.6601 10.44Z"
                                                stroke={`${
                                                  theme === "dark"
                                                    ? "#ffffff"
                                                    : "gray"
                                                }`}
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                              <path
                                                d="M15.06 19.39C14.44 19.81 13.66 20.16 12.71 20.47L11.13 20.99C7.15998 22.27 5.06997 21.2 3.77997 17.23L2.49997 13.28C1.21997 9.30998 2.27997 7.20998 6.24997 5.92998L7.82997 5.40998C8.23997 5.27998 8.62997 5.16998 8.99997 5.09998C8.69997 5.70998 8.45997 6.44998 8.25997 7.29998L7.27997 11.49C6.29997 15.67 7.58998 17.73 11.76 18.72L13.44 19.12C14.02 19.26 14.56 19.35 15.06 19.39Z"
                                                stroke={`${
                                                  theme === "dark"
                                                    ? "#ffffff"
                                                    : "gray"
                                                }`}
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                              <path
                                                d="M12.64 8.53003L17.49 9.76003"
                                                stroke={`${
                                                  theme === "dark"
                                                    ? "#ffffff"
                                                    : "gray"
                                                }`}
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                              <path
                                                d="M11.66 12.4L14.56 13.14"
                                                stroke={`${
                                                  theme === "dark"
                                                    ? "#ffffff"
                                                    : "gray"
                                                }`}
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>{" "}
                                            </g>
                                          </svg>
                                        )}
                                      </div>
                                      <div className="justify-start w-14 sm:w-14 md:w-24 lg:w-40 xl:w-56">
                                        {/* Adjust this width */}
                                        <p className="px-2 py-1.5 text-sm text-left truncate cursor-pointer">
                                          {/* {truncateTitle(
                                      note.title,
                                      calculateLimit()
                                    )} */}
                                          {note.title}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-center px-3 ">
                                      {/* <div
                                  className={` ${
                                    selectedNote === note.id
                                      ? "opacity-100"
                                      : ""
                                  } opacity-0 group-hover:opacity-100`}
                                >
                                  <Archive />
                                </div> */}
                                      <div
                                        className={`ml-2.5  ${
                                          selectedNote === note.id
                                            ? "opacity-100"
                                            : ""
                                        } opacity-0 group-hover:opacity-100 `}
                                        onClick={() =>
                                          handleDeleteNote(note.id)
                                        }
                                      >
                                        <Trash />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                {notes.length === 0 && (
                  <div className="flex flex-col items-center justify-center mt-72">
                    <p className="text-sm text-gray-400">No notes available</p>
                    <p className="text-sm text-gray-400">Create a new note</p>
                  </div>
                )}
              </ul>
            </nav>
          </div>
        </div>
        <div
          className={`flex-1 text-white
          ${
            theme === "dark"
              ? "bg-[#000000] text-white "
              : "bg-[#f6f6f6] text-black"
          }
            `}
        >
          <div className="absolute flex flex-col cursor-pointer bottom-3 right-3">
            <div className="flex items-center justify-center">
              <span>
                <svg
                  className={`h-6 w-6 ${
                    theme === "dark"
                      ? "text-gray-400"
                      : "text-yellow-500 animate-pulse"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </span>
              <div
                className={`w-14 h-7 flex items-center rounded-full mx-3 px-1 ${
                  theme === "dark" ? "bg-blue-500" : "bg-yellow-500"
                }`}
                onClick={toggleTheme}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    theme === "dark" ? "translate-x-7" : ""
                  }`}
                ></div>
              </div>
              <span>
                <svg
                  className={`h-6 w-6 ${
                    theme === "dark"
                      ? "text-blue-500 animate-pulse"
                      : "text-gray-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              </span>
            </div>
          </div>
          {defaults ? (
            <DefaultView />
          ) : (
            <div>
              <div
                className={`${
                  theme === "dark" ? "bg-[#1a1a1a]  " : "bg-[#deedff]"
                }  text-white px-2 py-3 drag cursor-pointer`}
              >
                <div className="flex items-center justify-end space-x-2">
                  <div
                    class="bg-yellow-400 hover:bg-yellow-500 rounded-full p-2 cursor-pointer no-drag"
                    onClick={() => ipcRenderer.send("minimize-app")}
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M18 12H6"
                      ></path>
                    </svg>
                  </div>

                  <div
                    class="bg-green-500 hover:bg-green-600 rounded-full p-2 cursor-pointer no-drag"
                    onClick={() => ipcRenderer.send("maximize-app")}
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 3h6v6m-6 4h6v6m-6-6H9m0-6H3V3h6m0 6V3m0 6v6"
                      ></path>
                    </svg>
                  </div>

                  <div
                    class="bg-red-500 hover:bg-red-600 rounded-full p-2 cursor-pointer no-drag"
                    onClick={() => ipcRenderer.send("close-app")}
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div
                className={` ${
                  theme === "dark"
                    ? "bg-[#000000] text-white "
                    : "bg-[#f6f6f6] text-black"
                } px-4 py-3 sticky top-0 z-10`}
              >
                <div className="flex flex-row items-center justify-end">
                  {isUnsavedChanges && (
                    <div className="text-right text-[#696969] text-sm">
                      Unsaved Changes
                    </div>
                  )}
                  <div className="ml-2 text-right">
                    {selectedNote ? (
                      <button
                        onClick={handleUpdateNote}
                        className={` px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none`}
                      >
                        Update Note
                      </button>
                    ) : (
                      <button
                        onClick={handleAddNote}
                        className={` px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none`}
                      >
                        Save Note
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={handleNoteTitleChange}
                  placeholder="Title"
                  className={`w-full p-4 text-2xl  placeholder-gray-400 ${
                    theme === "dark"
                      ? "bg-[#000000] text-white "
                      : "bg-[#f6f6f6] text-black"
                  } border-none rounded-md focus:outline-none `}
                />
              </div>
              <div className="px-4 mb-2">
                <p className="text-[#696969] text-xs">
                  {lastUpdated ? "Last Updated : " + lastUpdated : ""}
                </p>
              </div>
              <div className="mb-6">
                <textarea
                  value={noteContent}
                  style={{ resize: "none", height: "55vh" }}
                  onChange={handleNoteContentChange}
                  placeholder="Take a note..."
                  className={`w-full p-4  placeholder-gray-400 ${
                    theme === "dark"
                      ? "bg-[#000000] text-white "
                      : "bg-[#f6f6f6] text-black"
                  } border-none rounded-md focus:outline-none ${
                    theme === "dark" ? "sidebar" : "sidebar-light"
                  }`}
                ></textarea>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
