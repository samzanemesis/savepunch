/*
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <sam@sampavlovic.com> wrote this file.  As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.   Poul-Henning Kamp
 * ----------------------------------------------------------------------------
 */
const fs = require("fs-extra");
const request = require("sync-request");

var instance;
if(process.argv[2])
    instance=parseInt(process.argv[2]);
else
    instance=0;

var numConcurrentFetch = 1;
let initialThread = 400000;

//Console colorido
let colConsole = {
    Reset:"\x1b[0m",
    Bright:"\x1b[1m",
    Dim:"\x1b[2m",
    Underscore:"\x1b[4m",
    Blink:"\x1b[5m",
    Reverse:"\x1b[7m",
    Hidden:"\x1b[8m",
    FgBlack:"\x1b[30m",
    FgRed:"\x1b[31m",
    FgGreen:"\x1b[32m",
    FgYellow:"\x1b[33m",
    FgBlue:"\x1b[34m",
    FgMagenta:"\x1b[35m",
    FgCyan:"\x1b[36m",
    FgWhite:"\x1b[37m",

}

function EncodeThreadID(mylet, string){
	mylet = parseInt(mylet);
	if(mylet>26)
		string = EncodeThreadID(mylet/26, String.fromCharCode( mylet%26 + 97 )) + string;
	else
		string = String.fromCharCode( mylet%26 + 97 ) + string;
	return string;
}


const file = fs.createWriteStream("data.txt");

function GetThreadURL(threadNum, page)
{
    return "https://facepunchforum.azurewebsites.net/general/" + EncodeThreadID(threadNum, "") + "/savepunch/" + page + "/?json=1"
}

function IsThreadAlreadyArchived(threadNum)
{
    let foundfile = false;
    var threadID = EncodeThreadID(threadNum, "");
    var dir = fs.readdirSync("facepunch/");

    for (let i = 0; i < dir.length; i++) 
        if( fs.existsSync("facepunch/" + dir[i] + "/" + threadID + ".json" ) )
            return dir[i];
    
    return null;
}

function GetThread(threadNum)
{

    var alreadyArchieved = IsThreadAlreadyArchived(threadNum);

    if( !alreadyArchieved )
    {
        let thread = GetThreadFromURL(threadNum, 1 );
        if(thread)
        {
            console.log( colConsole.FgGreen + threadNum + " [!] Writing to disk");
            fs.outputFileSync("facepunch/" + thread.Forum.Name + "/" + thread.Thread.ThreadId + ".json", JSON.stringify( thread) );
        }
    }
 //   else
 //   {
 //       console.log( colConsole.FgGreen + threadNum + " [!] Already exists, skipping");
 //   }

    GetThread(threadNum+numConcurrentFetch);
    
    
}

function GetThreadFromURL(threadNum, page)
{
    let url = GetThreadURL(threadNum, page);
    let body = request('GET', url);
    try {
        var json = JSON.parse(body.getBody('utf8'));
        if(page <= 1)
            console.log( colConsole.FgMagenta + threadNum + " [>] "  + json.Forum.Name + " - " + colConsole.FgYellow + json.Thread.Name );
        else
            console.log( colConsole.FgMagenta + threadNum + " [>] "  + json.Forum.Name + " - " + colConsole.FgYellow + json.Thread.Name + colConsole.FgMagenta + " - Fetching Page " + page)

        if(json.Page.Total > ( json.Page.PerPage + json.Page.Current) )
        {
            let nextPage = GetThreadFromURL(threadNum, page+1);
            
            //FP Server itself seems to have a problem where it can't load certain pages of really big threads, in this case, concatenate in emergency
            if(nextPage)
            {
                let numPosts = json.Posts.length;
                let numPostsConcat = json.Posts.length + nextPage.Posts.length;
                for (let i = numPosts; i < numPostsConcat; i++) 
                {
                    json.Posts[i] = nextPage.Posts[i - numPosts]; 
                }
            }
            
        }
    }
    catch(err) {
        console.log( colConsole.FgRed + threadNum +" [#] Not a valid thread!" );
        return null;
    }

    return json;
    
}


function StartFetching()
{
    for(let i =0;i < numConcurrentFetch; i++)
    {
        GetThread(initialThread+i);
    }
}

GetThread(initialThread+instance);

//StartFetching();

