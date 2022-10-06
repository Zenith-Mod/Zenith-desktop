import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "It's DevilBro Time!",
    description: "Simulates DevilBro's plugins' memory leaks",
    authors: [
        Devs.Xinto
    ],
    dependencies: [
        "CommandsAPI"
    ],
    commands: [
        {
            name: "memoryleak",
            description: "Generate a memory leak",
            execute(_args, ctx) {
                const channelId = parseInt(ctx.channel.id);
                let arr: string[] = [];
                for (let i = 0; i < channelId; i++) {
                    arr[i] = (i * channelId).toString();
                }
                return {
                    content: "You did indeed generate a memory leak"
                };
            },
        }
    ]
});
