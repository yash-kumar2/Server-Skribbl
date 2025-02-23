const users = []
let games=[]
const startGame=(room)=>{
    console.log("here")
    console.log(room)
    games=games.filter((g)=>g.room!=room)
    games.push({room,round:0,player:0,turn:0,
        players:users.filter((user)=>user.room==room).map((user)=>{
            return {
                user,
                score:0


            }
        }),
        timer:null,
        options:null,
        guessers:[]
    })
    console.log(games)

}
const getGame=(room)=>{
    return games.find((game)=>game.room==room)
}

const addUser = ({ id, username, room ,option}) => {
    // Clean the data
    if (!username || !room) {
        return {
            error: 'Username and room are required!'
        }
    }
    console.log(option)

    username = username.trim().toLowerCase()
    room = room.trim().toLowerCase()
    if (!username || !room) {
        return {
            error: 'Username and room are required!'
        }
    }

    // Validate the data
   
    // Check for existing user
    if(option=='create'){
        const existingUser = users.find((user) => {
            return user.room === room 
        })
    
        // Validate username
        if (existingUser) {
            return {
                error: ' room already exists!'
            }
        }

    const user = { id, username, room,owner:true }
    users.push(user)
    return { user }


    }
    else{
    const existingUser = users.find((user) => {
        return user.room === room && user.username === username
    })

    // Validate username
    if (existingUser) {
        return {
            error: 'Username is in use!'
        }
    }
    const user = { id, username, room,owner:false }
    users.push(user)
    return { user }



}

    // Store user

    
}

const removeUser = (id) => {
    const index = users.findIndex((user) => user.id === id)

    if (index !== -1) {
        return users.splice(index, 1)[0]
    }
}

const getUser = (id) => {
    return users.find((user) => user.id === id)
}

const getUsersInRoom = (room) => {
    room = room.trim().toLowerCase()
    return users.filter((user) => user.room === room)
}

module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,
    startGame,
    getGame
}