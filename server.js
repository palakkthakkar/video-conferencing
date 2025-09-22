const express=require("express");// include express server file
const path=require("path");
var app=express(); //created a web server on Node.js using Express framework

var server=app.listen(process.env.PORT || 3000,function(){
    console.log("listening on port 3000");
});


const fs=require('fs');
const fileUpload=require("express-fileupload");
const io=require("socket.io")(server,{
    allowEIO3:true,
});

app.use(express.static(path.join(__dirname,"")));
// console.log(__dirname);
// express.static serves the static files(html,css,javascript files) from the ""(root) directory. 
 

var userConnections=[]; 

//The "connection" event is emitted by the Socket.IO server whenever a new client establishes a connection with the server.
io.on("connection",(socket)=>{
    // console.log(socket);
    console.log("socket id is",socket.id);
    socket.on("userconnect",(data)=>{
        console.log("userconnect",data.displayName,data.meetingid);
        var other_users=userConnections.filter(
            (p)=>p.meeting_id==data.meetingid);
        userConnections.push({
            connectionId:socket.id,
            user_id:data.displayName,
            meeting_id:data.meetingid,
        });
        var userCount=userConnections.length;
        console.log(userCount);
        other_users.forEach((v)=>{
            socket.to(v.connectionId).emit("inform_others_about_me",{
                other_user_id:data.displayName,
                connId:socket.id,
                userNumber:userCount
            });
        });
        socket.emit("inform_me_about_other_user",other_users);
    });
    socket.on("SDPProcess",(data)=>{
        socket.to(data.to_connid).emit("SDPProcess",{
            message:data.message,
            from_connid:socket.id,
        })
    })

    socket.on("sendMessage",(msg)=>{
        console.log("msg");
        var mUser=userConnections.find((p)=>p.connectionId==socket.id);
        if(mUser){
            var meetingid=mUser.meeting_id;
            var from=mUser.user_id;
            var list=userConnections.filter((p)=>p.meeting_id==meetingid); 
            list.forEach((v)=>{
                socket.to(v.connectionId).emit("showChatMessage",{
                    from:from,
                    message:msg
                });
            });
        }
    });
    socket.on("fileTransferToOther",(msg)=>{
        console.log("msg");
        var mUser=userConnections.find((p)=>p.connectionId==socket.id);
        if(mUser){
            var meetingid=mUser.meeting_id;
            var from=mUser.user_id;
            var list=userConnections.filter((p)=>p.meeting_id==meetingid); 
            list.forEach((v)=>{
                socket.to(v.connectionId).emit("showFileMessage",{
                   username:msg.username,
                   meetingid:msg.meetingid,
                   filePath:msg.filePath,
                   fileName:msg.fileName,
                });
            });
        }
    });
    socket.on("fileTransferToOther",function(msg){
        console.log(msg);
    })



    socket.on("disconnect",function(){
        console.log("user got disconnected");
        var disUser=userConnections.find((p)=>p.connectionId==socket.id);
        if(disUser){
            var meetingid=disUser.meeting_id;
            userConnections=    userConnections.filter((p)=>p.connectionId!=socket.id);
            var list=userConnections.filter((p)=>p.meeting_id==meetingid);
            list.forEach((v)=>{
                var userNumberAfUserLeave=userConnections.length;
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user",{
                    connId:socket.id,
                    uNumber:userNumberAfUserLeave
                });
            });
        }
    });

});
// The on() function is used to listen for events.
//sets up an event listener for the "connection" event in Socket.IO. It listens for incoming client connections and logs the socket ID of each connected client.
app.use(fileUpload());
app.post("/attachimg",function(req,res){
    var data=req.body;
    var imageFile=req.files.zipfile;
    console.log(imageFile);
    var dir="public/attachment/"+data.meeting_id+"/";
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    imageFile.mv("public/attachment/"+data.meeting_id+"/"+imageFile.name,function(error){
        if(error){
            console.log("couldn't upload the image file,error:",error);
        }else{
            console.log("Image file successfully uploaded.");
        }
    })
})









