// Generated IDL for Lakkhi program

export const IDL = {
  "version": "0.1.0",
  "name": "lakkhi_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createCampaign",
      "accounts": [
        {
          "name": "campaign",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "campaignTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "targetAmount",
          "type": "u64"
        },
        {
          "name": "endDate",
          "type": "i64"
        },
        {
          "name": "imageUrl",
          "type": "string"
        },
        {
          "name": "category",
          "type": "string"
        }
      ]
    },
    {
      "name": "donateTokens",
      "accounts": [
        {
          "name": "campaign",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "donor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "donorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "campaignTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addCampaignUpdate",
      "accounts": [
        {
          "name": "campaign",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "update",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "content",
          "type": "string"
        }
      ]
    },
    {
      "name": "releaseFunds",
      "accounts": [
        {
          "name": "campaign",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "recipient",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "campaignTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "imageUrl",
            "type": "string"
          },
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "targetAmount",
            "type": "u64"
          },
          {
            "name": "currentAmount",
            "type": "u64"
          },
          {
            "name": "endDate",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "donorsCount",
            "type": "u64"
          },
          {
            "name": "updatesCount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "CampaignUpdate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "publicKey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "updateId",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CampaignNotActive",
      "msg": "Campaign is not active"
    },
    {
      "code": 6001,
      "name": "CampaignEnded",
      "msg": "Campaign has ended"
    },
    {
      "code": 6002,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6003,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6004,
      "name": "InvalidEndDate",
      "msg": "End date must be in the future"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "Only the campaign creator can perform this action"
    },
    {
      "code": 6006,
      "name": "CampaignStillActive",
      "msg": "Cannot release funds while campaign is still active"
    }
  ]
}; 