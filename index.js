require('dotenv').config(); //initialize dotenv
const Discord = require('discord.js'); //import discord.js
const ethers = require('ethers'); // import ethers
const fs = require('fs');
const axios = require('axios');
const Database = require('@replit/database');
const db = new Database();



const client = new Discord.Client(); //create new client



// Replace YOUR_PROVIDER with the URL of a JSON-RPC provider
const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/8231230ce0b44ec29c8682c1e47319f9');

// Replace YOUR_CONTRACT_ADDRESS with the address of the contract
const solscriptionAddress = '0xE0Be388Ab81c47B0f098D2030a1c9Ef190691a8A';

// Replace YOUR_ABI_FILE with the path to the JSON file containing the ABI
const abiFile = './Solscription.json';

const solscriptionAbi = JSON.parse(fs.readFileSync(abiFile, 'utf8'));

const solscriptionContract = new ethers.Contract(solscriptionAddress, solscriptionAbi.output.abi, provider);

const axiosInstance = axios.create({
    headers: {
        'token': `${process.env.BEARER_TOKEN}`
    }
});

// set new key & value
async function setKey(key, value){
    try {
        await db.set(key, value)
    } catch (error) {
        console.log(err);
        
    }
    
}

// set new key & value
async function getKeyValue(key){
    try {
        let value = await db.get(key)
        return value
    } catch (err) {
        console.log(err);
        
    }
    
}

// set new key & value
async function deleteKey(key){
    try {
        await db.delete(key)
    } catch (err) {
        console.log(err);
        
    }
    
}

// set new key & value
async function listKeys(){
    try {
        let keys = await db.list()
        return keys
    } catch (err) {
        console.log(err);
        
    }
    
}



// fetch token owned async
async function fetchWallet(address) {
    
    try {
        const solsWallet = await axios.get('https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress='+solscriptionAddress+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=S3KASSMNT3ARZHEUU2NM9G3IMXH98BB8W7');
        return solsWallet.data.result[0]['to']
    } catch(err) {
        console.log(err);
    }
}

// fetch token owned async
async function fetchToken(address) {
    
    try {
        const solsTokenOwned = await axios.get('https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress='+solscriptionAddress+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=S3KASSMNT3ARZHEUU2NM9G3IMXH98BB8W7');
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

// check opensea bio for added code
async function openseaBioChange(code, openseaBio) {
    
    try {
        // if code added to bio (included in bio) assign role 
        if (openseaBio.includes(code)) {
            return true                      
        } else {
            return false
        }
    } catch(err) {
        console.log(err);
    }
}





client.on('ready', async () => {
    client.channels.cache.get("946417287672496145").send("Please enter the wallet you want to verify subscription for to begin");
    let keys = await listKeys();
    if (keys === !null ) {
        for (let i = 0; i < keys.length; i++) {
            // get key value iwth address token and expiry
            let keyValue = await getKeyValue(keys[i])
            let timeStamp = new Date().getUTCMilliseconds();
            if (keyValue[2] < timeStamp) {
                // query actual token expiry 
                let userExpires = await solscriptionContract.ownerOf(solsTokenOwned)
                console.log(userExpires);
                // if not renewd
                if (userExpires < timeStamp ) {
                    //remove role
                    const guild =  message.guild;
                    const role = guild.roles.cache.get('1063121737769820270');
                    const member = guild.members.cache.get(message.author.id);
                    member.roles.remove(role);
                    await deleteKey();
                }
            }
        }
    } else {
        console.log('no users wallets info')
    }
    
    // login consol message
    console.log(`Logged in as ${client.user.tag}!`);
});

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
            // verify input wallet is a Sols Wallet
            if (solsWallet.toLowerCase() === address.toLowerCase()) {
                // get tokens owned from async above
                let solsTokenOwned = await fetchToken(address)
                console.log(solsTokenOwned)
                // check user is on active sub
                let userOf = await solscriptionContract.userOf(solsTokenOwned)
                console.log(userOf);
                // wallet set in subs must be equal to owner of token //if sub not set return a zero address
                if (userOf.toLowerCase() === solsWallet.toLowerCase()) {
                    
                    // check expiry of sub
                    let userExpires = await solscriptionContract.userExpires(solsTokenOwned)
                    console.log(userExpires);
                    
                    // Generate code
                    const code = Math.random().toString(36).substring(7);
                    
                    // Send message with code to the user
                    message.reply(`Your Wallet ownes subscription token [${solsTokenOwned}] expring on [${userExpires}] Enter code [${code}] into your Opensea Bio to confirm your OWnership and get discord role`);
                    
                    // opensea bio get & check for code included in bio
                    const openseaBio = await fetchOpenseaBio(address);
                    console.log(openseaBio);
                    
                    // if code not added setIterval check code
                    let nIntervId;
                    if (!nIntervId) {   
                        nIntervId = setInterval(openseaBioChange, 3000)
                        if (openseaBioChange(code, openseaBio)) {
                            clearInterval(nIntervId);
                            nIntervId = null;
                            const guild =  message.guild;
                            const role = guild.roles.cache.get('1063121737769820270');
                            const member = guild.members.cache.get(message.author.id);
                            member.roles.add(role);
                            await setKey(message.author.id, [userOf, solsTokenOwned, userExpires])
                            
                            // Send message with code to the user
                            message.reply(`Your discord role assigned you can view all locked channels`);
                        } 
                    }
                } else {
                    message.reply("subscription not active, please activate it & try again")
                }
            } else { 
                message.reply("you dont have a subscription token, please enter another valid Ethereum address")
                console.log("err");
            }
        } else {
            message.reply("please enter a valid Ethereum address")
        }
    }
});

//make sure this line is the last line
client.login(process.env.CLIENT_TOKEN); //login bot using token