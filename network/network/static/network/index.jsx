function SocialNetworkApp() {
    return (
        <div>
            <h1>All Posts</h1>
            <NewPost />
        </div>
    );
}

function NewPost() {
    const [content, setContent] = React.useState("");
    /*
    const [posts, dispatch] = React.useReducer(
        postsReducer,
        initialPosts
    );
    */

    function handleSubmitPost(content) {

        fetch('/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({
                poster: logged_in_user,
                content: content
            }),
            credentials: 'include',        
        })
        .then(response => response.json())
        .then(result => {
            if(result.message) {
                console.log(result.message);
            } else {
                alert(result.error);
            }
            console.log(result);
        });

        return false;

        /*
        dispatch({
            type: 'added',
            id: 0,
            content: content,
        });
        */
    }

    return (
        <div className="new-post">
            <h4>New Post</h4>
            <form>
                <textarea
                    className="form-control"
                    value={content}
                    onChange={(e)=>setContent(e.target.value)}
                    rows="3"
                />
            </form>
            <button onClick={()=>{
                setContent('');
                handleSubmitPost(content);
            }}
            className="btn btn-primary"
            type="submit"
            >Post</button>
        </div>
    );
}

/*
function postsReducer(posts, action) {
    switch (action.type) {
        case added: {
            return [...posts, {
                id: action.id,
                content: action.content,
            }];
        }
        default: {
            throw Error('Unknown action: ' + action.type);
        }
    }
}
*/

// Global Variable
let logged_in_user = "";

function load_post() {
    fetch('/get-username')
    .then(response => response.json())
    .then(data => {
        logged_in_user = data.username;
    })

    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<SocialNetworkApp />);
}


// Ensure that the component only loads after the DOM is fully loaded
window.onload = function() {
    load_post();
};


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const getCsrfToken = () => getCookie('csrftoken');