const { app } = require('@azure/functions');
const mysql = require('promise-mysql');

app.http('httpapicrudchatbot', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        //const name = request.query.get('name') || await request.text() || 'world';
        const rutaAlArchivo = './DigiCertGlobalRootCA.crt(1).pem';
        try {            
        
            const connection = await mysql.createPool({
                host: 'serverchatbotmysql.mysql.database.azure.com',
                user: 'adminchatbot',
                password: 'd9AMmyVBS9fdXP',
                database: 'azuredbchatbot',
                ssl: {ca: `${rutaAlArchivo}`,
                        rejectUnauthorized: false,
                    },
            });

            if (request.method === 'GET') {
                // Manejar solicitud GET para obtener mensajes
                const sender = request.query.get('sender');
                const messages = await queryDB(connection,  sender);
                context.res = {
                    body: JSON.stringify(messages),
                };
            } else if (request.method === 'POST') {
                // Manejar solicitud POST para guardar mensajes
                const requestData = request.body;
                const chatId = await getMessagesForSender(connection, requestData);
                context.res = {
                    body: { chatId },
                };
            } else {
                context.res = {
                    status: 405,
                };
            }

            connection.end();
        } catch (error) {
            context.error(`Error en la conexión a la base de datos: ${error.message}`);
            context.res = {
                status: 500,
                body: 'Error en la conexión a la base de datos',
            };
        }    

        return context.res;
    }
});

async function getMessagesForSender(connection, sender) {
    // Implementa la lógica para obtener mensajes de la base de datos
    const resultChat = await connection.query('SELECT a.* FROM chats a WHERE a.sender = ? order by a.id', [sender]);
    console.log(resultChat); 
    const arrayChats = resultChat.map(async chat => { 
        const resultMessges = await connection.query('SELECT role, content FROM messages b WHERE b.id_chat = ? order by b.id', [chat.id]);          
        const chats = {};
        //chats.id = chat.id;
        //chats.sender = chat.sender;
        //chats.object = chat.object;
        chats.date = chat.date;        
        chats.conversation_history = resultMessges.map(msg => {
            const messages = {
                role: msg.role,
                content: msg.content,
            }
            return messages;
        });
        console.log(resultMessges);
        console.log(chats.conversation_history);
        
        return chats;
    });

    console.log(chats);
    return arrayChats;
}

async function saveConversation(connection, requestData) {
    // Implementa la lógica para guardar la conversación en la base de datos
    const [result] = await connection.execute('INSERT INTO chats (date, sender, object) VALUES (?, ?, ?)', [
        requestData.date,
        requestData.sender,
        JSON.stringify(requestData),
    ]);
    const chatId = result[0].insertId;
    return chatId;
}

async function queryDB(connection, query, fields = undefined) {
    var result;
    if (fields !== undefined )
        result = await connection.query(query, [fields]);
    else
        result = await connection.query(query);
    return result;
}