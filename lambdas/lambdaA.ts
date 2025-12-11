/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DBAuctionItem , AuctionItem } from "../shared/types";
const ddbDocClient = createDDbDocClient();

export const handler: SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));

  for (const record of event.Records) {
    const snsMessage = JSON.parse(record.body);
    const auctionItem = JSON.parse(snsMessage.Message) as AuctionItem;

    //const auctionItem = JSON.parse(record.body) as AuctionItem;

    const auctionTypeAttribute = snsMessage.MessageAttributes?.auction_type?.Value;

    const dbItem: DBAuctionItem = {
      ...auctionItem,
      auctionType: auctionTypeAttribute as "Public" | "Private" | "Online",  // Hardcoded for now.
    }

    if (auctionItem.marketValue < auctionItem.minimumPrice) {
      throw new Error(
        "Stock item marketvalue is less than minimum price"
      );
    }

    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          ...dbItem,
        },
      })
    );
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
