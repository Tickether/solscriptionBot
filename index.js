require('dotenv').config(); //initialize dotenv
const Discord = require('discord.js'); //import discord.js
const ethers = require('ethers'); // import ethers
const fs = require('fs');
const axios = require('axios');
const Database = require('@replit/database');



const db = new Database();

const client = new Discord.Client(); //create new client

// Replace YOUR_PROVIDER with the URL of a JSON-RPC provider
const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/8231230ce0b44ec29c8682c1e47319f9');

// Replace YOUR_CONTRACT_ADDRESS with the address of the contract
const solscriptionAddress = '0x611Ea02425A83Ab6018e7149166ECf2E48D8F0CA';

// Replace YOUR_ABI_FILE with the path to the JSON file containing the ABI
const abiFile = './Solscription.json';

const solscriptionAbi = JSON.parse(fs.readFileSync(abiFile, 'utf8'));

const solscriptionContract = new ethers.Contract(solscriptionAddress, solscriptionAbi.abi, provider);

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




client.on('ready', async () => {
    client.channels.cache.get("946417287672496145").send("Please enter the wallet you want to verify subscription for to begin");
    async function getKeysDeleteRoles() {
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
                        await deleteKey(keys[i]);
                    }
                }
            }
        } else {
            console.log('no users wallets info')
        }
    }
    setInterval(getKeysDeleteRoles, 300000)
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

                            do {
                                openseaBio = await fetchOpenseaBio(address);
                                console.log(openseaBio)

                                // wait for 2 seconds before running the loop again
                                setTimeout(() => {}, 15000);
                            } while (openseaBio === null || openseaBio === "undefined");
                            //loop exit: true
                            // checkfor code after
                            do {
                                //check opensea
                                openseaBio = await fetchOpenseaBio(address);
                                console.log(openseaBio)
    
                                // wait for 2 seconds before running the loop again
                                setTimeout(() => {}, 15000);
                                
                                // check opensea bio for added code    
                            } while (openseaBio.includes(code) === false);
                            //loop exit: true

                            const guild =  message.guild;
                            const role = guild.roles.cache.get('1068292965606375425');
                            const member = guild.members.cache.get(message.author.id);
                            member.roles.add(role);
                            await setKey(message.author.id, [userOf, solsTokenOwned, userExpires])
                            
                            // Send message role added msg to the user
                            message.reply(`Your discord role assigned you can view all locked channels unlocked by the role`);                        
                            
                        } else { // opensea with bio info already set
                            do {
                                //check opensea
                                openseaBio = await fetchOpenseaBio(address);
                                console.log(openseaBio)
    
                                // wait for 2 seconds before running the loop again
                                setTimeout(() => {}, 15000);
                                
                                // check opensea bio for added code    
                            } while (openseaBio.includes(code) === false);
                            //loop exit: true
                            
                            const guild =  message.guild;
                            const role = guild.roles.cache.get('1068292965606375425');
                            const member = guild.members.cache.get(message.author.id);
                            member.roles.add(role);
                            //await setKey(message.author.id, [userOf, solsTokenOwned, userExpires])
                            
                            // Send message role added msg to the user
                            message.reply(`Your discord role assigned you can view all locked channels unlocked by the role`);                        
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