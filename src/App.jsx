import { useState, useEffect } from "react";
import PollsEEApi from "./polls_ee_client.js";

function App() {
    const [api] = useState(new PollsEEApi(
        "https://sera-vote-main-926007600519.us-central1.run.app",
        "8B5052377B80AE057E66901950D6131E374E10FA56112799995624FD4B3F1D30",
        "20F3FE2968AC9A790B17F61649C101B5CDA95126BB89E6E041878B6673562AB9"
    ));

    const allChainConfigs = [
        {
            network: "testnet",
            address: "EQDtPeiIAH4QtlHZD8p6_pXoE6iRu3APA8-4RkrXVsEa0PsW"
        },
        {
            network: "mainnet",
            address: "EQCG64YTmSggDkPMf4D8PhIhaTxJAe6RW4wp4Y_F0CiUyXFL"
        }
    ];

    const [polls, setPolls] = useState([]);
    const [selectedChainConfig, setSelectedChainConfig] = useState(allChainConfigs[0]);
    const [selectedPoll, setSelectedPoll] = useState(null);
    const [userToken, setUserToken] = useState("");
    const [voteKey, setVoteKey] = useState("");
    const [result, setResult] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchPolls = async () => {
        try {
            const r = await api.getPolls();
            const json = await r.json();
            setPolls(json);
        } catch (err) {
            console.error("Failed to fetch polls:", err);
        }
    };

    useEffect(() => {
        fetchPolls().then(() => console.log("Yay"));
    }, []);

    const createPoll = async (question, options, batchSize) => {
        try {
            const r = await api.createPoll(question, options, batchSize, selectedChainConfig.network, selectedChainConfig.address);
            setResult(r);
            setShowCreateModal(false);
            fetchPolls();
        } catch (e) {
            console.log("Error creating poll", e);
        }
    };

    const createUser = async () => {
        const token = await api.createUser("1341462357", "telegram", "Al", "M", "alm023");
        setUserToken(token);
    };

    const vote = async () => {
        if (!selectedPoll || !voteKey || !userToken) return alert("Fill vote key and authenticate");
        const r = await api.voteInPoll(selectedPoll.id, voteKey, userToken);
        setResult(r);
        await fetchPoll(selectedPoll.id);
    };


    function parseJwt (token) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    }

    const fetchPoll = async (pollId) => {
        try {
            const r = await api.getPoll(pollId);
            const json = await r.json();
            let idx = polls.indexOf(json);
            polls[idx] = json;
            setPolls(polls)
        } catch (err) {
            console.error("Failed to fetch poll:", err);
        }
    };

    return (
        <div style={{ fontFamily: "Arial, sans-serif", height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
            <header style={{ padding: "1rem", backgroundColor: "#282c34", color: "white", display: "flex", justifyContent: "space-between", alignItems: "stretch" }}>
                <h1 style={{ margin: 0 }}>PollsEE</h1>
                <button onClick={createUser} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
                    {userToken ? parseJwt(userToken)["user"]["id"] : "Authenticate"}
                </button>
            </header>

            <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100vw", height: "100vh" }}>
                <aside style={{ width: "300px", borderRight: "1px solid #ccc", padding: "1rem", overflowY: "auto" }}>
                    <button onClick={() => setShowCreateModal(true)} style={{ marginBottom: "1rem" }}>Create Poll</button>
                    <h3>Polls</h3>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {polls.map((poll) => (
                            <li key={poll.id} style={{ padding: "0.5rem", cursor: "pointer", backgroundColor: selectedPoll?.id === poll.id ? "#eee" : "transparent" }}
                                onClick={() => setSelectedPoll(poll)}>
                                {poll.question}
                            </li>
                        ))}
                    </ul>
                </aside>

                <main style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
                    {selectedPoll ? (
                        <div>
                            <h2>{selectedPoll.question}</h2>
                            <ul>
                                {selectedPoll.answers.map((opt) => (
                                    <li key={opt.key} style={{ margin: "0.5rem 0" }}>
                                        <label>
                                            <input type="radio" name="vote" value={opt.key} onChange={(e) => setVoteKey(e.target.value)} />
                                            {opt.value}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={vote} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>Vote</button>

                            <section style={{ marginTop: "2rem" }}>
                                <h3>Result / Response</h3>
                                <pre>{JSON.stringify(result, null, 2)}</pre>
                            </section>
                        </div>
                    ) : (
                        <p>Select a poll to see details</p>
                    )}
                </main>
            </div>

            {showCreateModal && (
                <CreatePollModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createPoll}
                    allChainConfigs={allChainConfigs}
                    selectedChainConfig={selectedChainConfig}
                    setSelectedChainConfig={setSelectedChainConfig}
                />
            )}
        </div>
    );
}

function CreatePollModal({ onClose, onCreate, allChainConfigs, selectedChainConfig, setSelectedChainConfig }) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState([{ key: "opt0", value: "" }, { key: "opt1", value: "" }]);
    const [batchSize, setBatchSize] = useState(5);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index].value = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, { key: `opt${options.length+2}`, value: "" }]);
    };

    const handleSubmit = () => {
        const filteredOptions = options.filter(o => o.value.trim() !== "");
        if (!question || filteredOptions.length < 2) return alert("Provide question and at least 2 options");
        for (let i = 0; i < filteredOptions.length; i++) {
            filteredOptions[i].key = filteredOptions[i].value.trim().replace(/ /g, "_").toLowerCase();
        }
        onCreate(question, filteredOptions, batchSize);
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center"
        }}>
            <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "8px", width: "400px" }}>
                <h2>Create Poll</h2>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.25rem" }}>Chain Config:</label>
                    <select
                        value={selectedChainConfig.address}
                        onChange={(e) => {
                            const cfg = allChainConfigs.find(c => c.address === e.target.value);
                            if (cfg) setSelectedChainConfig(cfg);
                        }}
                        style={{ width: "100%", padding: "0.25rem" }}
                    >
                        {allChainConfigs.map((cfg) => (
                            <option key={cfg.address} value={cfg.address}>
                                {cfg.network} — {cfg.address}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <input
                        placeholder="Question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        style={{ width: "100%", marginBottom: "1rem" }}
                    />
                    {options.map((opt, i) => (
                        <input
                            key={opt.key}
                            placeholder={`Option ${i + 1}`}
                            value={opt.value}
                            onChange={(e) => handleOptionChange(i, e.target.value)}
                            style={{ width: "100%", marginBottom: "0.5rem" }}
                        />
                    ))}
                    <button onClick={addOption} style={{ marginBottom: "1rem" }}>Add Option</button>
                </div>
                <div>
                    <label>Batch size: </label>
                    <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
                </div>
                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
                    <button onClick={handleSubmit}>Create</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default App;
