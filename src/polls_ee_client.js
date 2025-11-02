import { ed25519 } from '@noble/curves/ed25519.js';

// Set the hash function (do this once, at the top of your file)

async function signRequest(secretKeyHex, body) {
    const ts = Math.floor(Date.now() / 1000);
    const tsStr = ts.toString();


    const encoder = new TextEncoder();
    const tsBytes = encoder.encode(tsStr);


    const bodyBytes = body ? encoder.encode(JSON.stringify(body)) : new Uint8Array();
    const message = new Uint8Array(tsBytes.length + bodyBytes.length);
    message.set(tsBytes, 0);
    message.set(bodyBytes, tsBytes.length);

    // Import secret key from hex
    const keyData = Uint8Array.from(secretKeyHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));

    // Sign
    const signature = await ed25519.sign(message, keyData);
    const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return { sig: sigBase64, ts: tsStr };
}

class PollsEEApi {
     baseUrl;
     tenantSCHex;
     adminSCHex;

     constructor(baseUrl, tenantSCHex, adminSCHex) {
        this.baseUrl = baseUrl;
        this.tenantSCHex = tenantSCHex;
        this.adminSCHex = adminSCHex;
     }


     createPoll = async (question, answers, batchSize) => {
         const body = {
             question: question || "Who should we select and dispatch to space?",
             answers: answers || [
                 {
                     key: "stalin",
                     value: "Joseph Stalin"
                 }, {
                    key: "mao",
                     value: "Mao ChzeDun"
                 }
             ],
             allow_multiple_answers: true,
             chain_config: {
                 target_type: "data_size",
                 target_value: batchSize || 5,
                 write_list: [
                     {
                         chain: "ton",
                         network: "mainnet",
                         address: "EQA-yc574Hs7jTOhyfCmVP0tVoOq0nMvp7dmYsxSN9fk6myX"
                     }
                 ]
             }
         };

        const {sig,  ts } = await signRequest(this.tenantSCHex, body)

         const result = await fetch(`${this.baseUrl}/poll`, {
             method: "POST",
             headers: {
                 "ts": ts,
                 "sig": sig,
                 "Content-Type": "application/json"
             },
             body: JSON.stringify(body)
         });
         return await result.json();
     }

    createUser = async (id, type, firstName, lastName, userName) => {
        const body = {
            id: id || "12345678",
            type: type || "telegram"
        };
        // optional in API, but required for UX. Should be sent at least once..
        if (firstName) {
            body["first_name"] = firstName
        }
        if (lastName) {
            body["last_name"] = lastName
        }

        if (userName) {
            body["username"] = userName;
        }


        const {sig,  ts } = await signRequest(this.tenantSCHex, body)

        const result = await fetch(`${this.baseUrl}/user`, {
            method: "POST",
            headers: {
                "ts": ts,
                "sig": sig,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const jsonResult = await result.json();
        return jsonResult["token"];
    }

    voteInPoll = async (pollId, answerKey, userToken) => {
        const body = {
            answer_key: answerKey,
        };

        const {sig,  ts } = await signRequest(this.tenantSCHex, body)

        const result = await fetch(`${this.baseUrl}/poll/${pollId}/vote`, {
            method: "POST",
            headers: {
                "ts": ts,
                "sig": sig,
                "Authorization": `Bearer ${userToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
       return  await result.json();
    }

    getVoteBlock = async(voteId) =>{
        const {sig,  ts } = await signRequest(this.adminSCHex, null)
        return await fetch(`${this.baseUrl}/vote/${voteId}/block`, {
            headers: {
                ts: ts,
                sig: sig,
            }
        });
    }

    getPoll = async(pollId) =>{
        return  await fetch(`${this.baseUrl}/poll/${pollId}`);
    }

    getPolls = async() =>{
        return  await fetch(`${this.baseUrl}/poll`);
    }

    getLeaderboard = async(pollId) =>{
        return  await fetch(`${this.baseUrl}/poll/${pollId}/leaderboard`);
    }

}

export default PollsEEApi;
