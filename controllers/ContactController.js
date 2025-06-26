import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Message from "../models/MessageModel.js";


export const searchContacts = async (request, response, next) => {
    try {
        const {searchTerm} = request.body;
        if (searchTerm === undefined || searchTerm === null || searchTerm.trim() === '') {
            return response.status(200).json({ contacts: [] });
        }
        const sanitizedSearchTerm = searchTerm.replace(
            /[.*+?${}()|[\]\\]/g,
            "\\$&"
        );
        const regex = new RegExp(sanitizedSearchTerm, "i");
        const contacts = await User.find({
            $or:[
                {name:regex},
                {email:regex}
            ]
        })
        .select('id email name image color');
        return response.status(200).json({contacts})
    } catch (error) {
        console.error("Error in searchContacts:", error);
        response.status(500).json({ message: "Internal server error." });
    }
}

export const getContactsToDm = async (request, response, next) => {
    try {
      let {userId} = request; 
      userId = new mongoose.Types.ObjectId(userId); 

      const contacts = await Message.aggregate([
        {
            $match:{
                $or:[{sender:userId}, {recipient:userId}]
            }
        },
        {
            $sort:{
                timestamp:-1
            },
        },
        {$group:{
            _id:{
                $cond:{
                    
                    if:{$eq:["$sender", userId]},
                    then: "$recipient",
                    else:"$sender"
                }
            },
            lastMessageTime:{$first: "$timestamp"} 
        }},
        {$lookup:{
            from:"users",
            localField: "_id",
            foreignField:"_id",
            as:"contactInfo",
        }},
        {
        $unwind:"$contactInfo",
        },
        {
            $project:{
                _id:1,
                lastMessageTime: 1,
                email:"$contactInfo.email" ,
                name:"$contactInfo.name" ,
                image:"$contactInfo.image" ,
                color:"$contactInfo.color" 
            },
        },
        {
            $sort:{
            lastMessageTime: -1
            }
        }
      ])
        return response.status(200).json({contacts})
    } catch (error) {
        
        response.status(500).json({ message: "Internal server error." });
    }
}

export const getAllContacts = async (request, response, next) => {
    try {
       const user = await User.find({_id:{$ne:request.userId}}, "name _id email");
       const contacts = user.map((user)=>({
          label: user.name? `${user.name}` : user.email,
          value: user._id,
       }))
        return response.status(200).json({contacts})
    } catch (error) {
        console.error("Error in getAllContacts:", error);
        response.status(500).json({ message: "Internal server error." });
    }
}
