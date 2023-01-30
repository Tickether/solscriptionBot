require('dotenv').config(); 
const Discord = require('discord.js');
const ethers = require('ethers'); 
const fs = require('fs');
const axios = require('axios');



//create new client
const client = new Discord.Client(); 

// Replace YOUR_PROVIDER with the URL of a JSON-RPC provider
const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/8231230ce0b44ec29c8682c1e47319f9');

// Replace YOUR_CONTRACT_ADDRESS with the address of the contract
const solscriptionAddress = '0x611Ea02425A83Ab6018e7149166ECf2E48D8F0CA';

// Replace YOUR_ABI_FILE with the path to the JSON file containing the ABI
const abiFile = './Solscription.json';

// read in content from file
const solscriptionAbi = JSON.parse(fs.readFileSync(abiFile, 'utf8'));

// Instanciate Contract 
const solscriptionContract = new ethers.Contract(solscriptionAddress, solscriptionAbi.abi, provider);


// axios header with opensea apiKey
const axiosInstance = axios.create({
    headers: {
        'token': `${process.env.BEARER_TOKEN}`
    }
});


// fetch holder list and check if wallet is in true of false
async function fetchWallet(address) {
    
    try {
        let solsWallet  = await axios.get('https://api-goerli.etherscan.io/api?module=account&action=tokennfttx&contractaddress='+solscriptionAddress+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=S3KASSMNT3ARZHEUU2NM9G3IMXH98BB8W7');
        solsWallet = solsWallet.data.result
        return solsWallet
       
    } catch(err) {
        console.log(err);
    }
}

// fetch token owned async
async function fetchToken(address) {
    
    try {
        const solsTokenOwned = await axios.get('https://api-goerli.etherscan.io/api?module=account&action=tokennfttx&contractaddress='+solscriptionAddress+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=S3KASSMNT3ARZHEUU2NM9G3IMXH98BB8W7');
        return solsTokenOwned.data.result[0]['tokenID']
    } catch(err) {
        console.log(err);
    }
}

// fetch opensea bio
async function fetchOpenseaBio(address) {
    
    try {
        const openseaBio = await axiosInstance.get(`https://api.felonsecurity.net/v1/nft/account/opensea/address=${address}`)
        return openseaBio.data.bio
    } catch(err) {
        console.log(err);
    }
}

// fetch sols list 
async function fetchSolsList() {
    
    try {
        const solsList = await axios.get('http://localhost:8000/api/cryptoVillageSols/');
        return solsList.data
    } catch(err) {
        console.log(err);
    }
}

// fetch sols user by discord ID 
async function fetchSolsUser(discordID) {
    
    try {
        const solsList = await axios.get(`http://localhost:8000/api/cryptoVillageSols/${discordID}`);
        return solsList.data
    } catch(err) {
        console.log(err);
    }
}

// add new sols user to solsList discord ID 
async function addSolsList(solsUser) {
    
    try {
        const solsListUser = await axios.post('http://localhost:8000/api/cryptoVillageSols/', solsUser);
        return solsListUser.data
    } catch(err) {
        console.log(err);
    }
}

// update  sols user in solsList 
async function updateSolsList(solsUserID, solsUserUpdate) {
    
    try {
        const solsListUpdate = await axios.put(`http://localhost:8000/api/cryptoVillageSols/${solsUserID}`, solsUserUpdate);
        return solsListUpdate.data
    } catch(err) {
        console.log(err);
    }
}

// when bot is ready...
client.on('ready', async () => {
    client.channels.cache.get("946417287672496145").send("Please enter the wallet you want to verify subscription for to begin");
    async function getSolsDeleteRoles() {
        let solsList = await fetchSolsList()
        console.log(solsList)
        
        // check if list is empty
        if (solsList.length >= 1 ) {
            
            // do checks for each items in solsList
            for (let i = 0; i < solsList.length; i++) {
                
                // get sols list item and current time
                let solsUser = solsList[i]
                let timeStamp = new Date().getUTCMilliseconds();
                
                // check address token and expiry
                if (solsUser.expires < timeStamp) {
                    
                    // query actual token expiry 
                    let userExpires = await solscriptionContract.userExpires(solsUser.tokenID)
                    console.log(userExpires);
                    
                    // if not renewed
                    if (userExpires < timeStamp ) {
                        
                        //remove role
                        const guild =  message.guild;
                        const role = guild.roles.cache.get('1063121737769820270');
                        const member = guild.members.cache.get(solsUser.discordID);
                        member.roles.remove(role);
                    
                    // if renewed 
                    } else {
                        
                        //update db
                        const solsUserUpdate = {
                            expires: userExpires
                        }
                        await updateSolsList(solsUser._id, solsUserUpdate);
                        
                        // check if role on discord user else add
                        if(!(member.roles.cache.some(role => role.name === 'Test'))){
                            member.roles.add(role);
                        }
                    }
                }
            }
        } else {
            console.log('no users wallets info')
        }
        
    }
    // repeat solsList Sweep for x period
    setInterval(getSolsDeleteRoles, 1000)
    // login consol message
    console.log(`Logged in as ${client.user.tag}!`);
});

// when bot sees a message from a specific channel...
client.on("message", async message => {
    const address = message.content
    
    // so bot wont reply itself
    if(message.author.bot) return
    
    // lock bot to specific channel using ID
    if (message.channel.id === "946417287672496145") {
        
        // Check the message content, and if it's a valid Ethereum address
        if(ethers.utils.isAddress(address)){
            message.reply("Please wait... confirming your solcription...")
            
            // get sols wallet from async above
            let solsWallet = await fetchWallet(address)
            console.log(solsWallet)
            
            // check if wallet query has membership token or not
            if (solsWallet.length >= 1) {
                solsWallet = solsWallet[0].to
                console.log(solsWallet)

                // verify input wallet is a Sols Wallet
                if (solsWallet === address.toLowerCase()) {

                    // get tokens owned from async above
                    let solsTokenOwned = await fetchToken(address)
                    console.log(solsTokenOwned)

                    // check user is on active sub
                    let userOf = await solscriptionContract.userOf(solsTokenOwned)
                    console.log(userOf);

                    // wallet set in subs must be equal to owner of token //if sub not set return a zero address
                    if (userOf.toLowerCase() === address.toLowerCase()) {
                        
                        // check expiry of sub
                        let userExpires = await solscriptionContract.userExpires(solsTokenOwned)
                        userExpires = parseInt(userExpires['_hex'],16)
                        console.log(userExpires);
                        
                        // Generate code
                        const code = Math.random().toString(36).substring(7);
                        
                        // Send message with code to the user
                        await message.reply(`Your Wallet ownes subscription token [${solsTokenOwned}] expring on [${new Date(userExpires * 1000)}] Enter code [${code}] into your Opensea Bio to confirm your OWnership and get discord role`);
                        let openseaBio =  await fetchOpenseaBio(address);
                        
                        

                        if (openseaBio === null) { // empty opensea Bio never set
                            
                            // while loop for null bio
                            do {
                                openseaBio = await fetchOpenseaBio(address);
                                console.log(openseaBio)

                                // wait for 2 seconds before running the loop again
                                setTimeout(() => {}, 15000);
                            } while (openseaBio === null || openseaBio === "undefined");
                            //loop exit: true
                            
                            // while loop for added bio check for code after...
                            do {
                                //check opensea
                                openseaBio = await fetchOpenseaBio(address);
                                console.log(openseaBio)
    
                                // wait for 2 seconds before running the loop again
                                setTimeout(() => {}, 15000);
                                
                                // check opensea bio for added code    
                            } while (openseaBio.includes(code) === false);
                            //loop exit: true

                            // check if user is in database
                            if (fetchSolsUser(message.author.id) === null) {
                                //add role constants
                                const guild =  message.guild;
                                const role = guild.roles.cache.get('1068292965606375425');
                                const member = guild.members.cache.get(message.author.id);
                                member.roles.add(role);
                                
                                // set info in a database for store
                                const solsUser = {
                                    discordID: message.author.id,
                                    wallet: userOf,
                                    tokenID: solsTokenOwned,
                                    expires: userExpires,
                                }
                                await addSolsList(solsUser)
                                
                                // Send message role added msg to the user
                                message.reply(`Your discord role assigned you can view all locked channels unlocked by the role`);                        
                                
                                
                            } else {
                                // set info in a database for store
                                const solsUser = {
                                    wallet: userOf
                                }
                                await addSolsList(solsUser)
                                
                                // Send message role added msg to the user
                                message.reply(`Your assigned wallet has been changed`);                        
                                
                                
                            }
                            
                        } else { // opensea with bio info already set

                            // while loop for full bio check for code after...
                            do {
                                //check opensea
                                openseaBio = await fetchOpenseaBio(address);
                                console.log(openseaBio)
    
                                // wait for 2 seconds before running the loop again
                                setTimeout(() => {}, 15000);
                                
                                // check opensea bio for added code    
                            } while (openseaBio.includes(code) === false);
                            //loop exit: true
                            
                            // check if user is in database
                            if (fetchSolsUser(message.author.id) === null) {
                                //add role constants
                                const guild =  message.guild;
                                const role = guild.roles.cache.get('1068292965606375425');
                                const member = guild.members.cache.get(message.author.id);
                                member.roles.add(role);
                                
                                // set info in a database for store
                                const solsUser = {
                                    discordID: message.author.id,
                                    wallet: userOf,
                                    tokenID: solsTokenOwned,
                                    expires: userExpires,
                                }
                                await addSolsList(solsUser)
                                
                                // Send message role added msg to the user
                                message.reply(`Your discord role assigned you can view all locked channels unlocked by the role`);                        
                                
                                
                            } else {
                                // set info in a database for store
                                const solsUser = {
                                    wallet: userOf
                                }
                                await addSolsList(solsUser)
                                
                                // Send message role added msg to the user
                                message.reply(`Your assigned wallet has been changed`);                        
                                
                                
                            }                        
                        }
                    } else {
                        message.reply("subscription not active, please activate it & try again")
                    }                    
                }
            } else { 
                await message.reply("you dont have a subscription token, please enter another valid Ethereum address")                                
            }
        } else {
            message.reply("please enter a valid Ethereum address")
        }
    }
});

//make sure this line is the last line
client.login(process.env.CLIENT_TOKEN); //login bot using token