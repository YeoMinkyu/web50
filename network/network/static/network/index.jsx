const UserNameContext = React.createContext("");


function SocialNetworkApp() {
    const [allPosts, setAllPosts] = React.useState([]);
    const [currentView, setCurrentView] = React.useState("all");
    const [loggedInUser, setLoggedInUser] = React.useState("");
    const [selectedUser, setSelectedUser] = React.useState(null);

    function handleUserClick(user) {
        // console.log("[Debug] handleUserClick function.")
        navigate(`profile/${user}`);
    }

    React.useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;

            // console.log("[Debug] Path name", path);
            if(path === "/following") {
                // console.log("[Debug] setCurrentView", path);              
                setCurrentView("following");
            } else if(path.startsWith("/profile")) {
                // console.log("[Debug] setCurrentView", path);
                
                const username = path.split("/")[2];
                setSelectedUser(username);
                setCurrentView("profile");
            }
            else {
                // console.log("[Debug] setCurrentView", path);
                
                setCurrentView("all");
            }
        };

        // Listen for back/forward browser actions
        window.addEventListener("popstate", handlePopState);

        //Initialize current view based on the URL
        handlePopState();

        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigate = (path) => {
        // Updates the browser’s URL to path, but the page doesn't reload.
        window.history.pushState({}, "", path);
        // Creates a popstate event manually.
        const popStateEvent = new PopStateEvent("popstate");
        // Triggers the popstate event 
        dispatchEvent(popStateEvent);
    }

    // Fetch logged-in user on mount
    React.useEffect(() => {
        fetch('/get-username')
            .then(response => response.json())
            .then(data => {
                setLoggedInUser(data.username);
            })
            .catch(error => console.error("Error fecthing username:", error));
        if (currentView === "all") {
            fetch('/get-posts')
                .then(response => response.json())
                .then(posts => {
                    setAllPosts(posts);
                    // console.log("[Debug] All posts: ", posts);
                })
                .catch(error => console.error("Error fetching posts:", error));
        }
    }, []);

    // console.log("[Debug] loggedInUser: ", loggedInUser);

    return (
        <div>
            <UserNameContext.Provider value={loggedInUser}>
                {loggedInUser && currentView === "all" && <NewPost posts={allPosts} setAllPosts={setAllPosts}/>}
                {currentView === "all" &&
                    <div className="all-post">
                        {allPosts && allPosts.map((post) => (
                            <Post key={post.id} onUserClicked={handleUserClick} post={post}/>
                        ))}
                    </div>
}
                {currentView === "following" && <Following onUserClicked={handleUserClick}/>
                }
                {currentView === "profile" && selectedUser && <UserProfile onUserClicked={handleUserClick} user={selectedUser}/>}
            </UserNameContext.Provider>
        </div>
    );
}


function NewPost({posts, setAllPosts}) {

    const [content, setContent] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const loggedInUser = React.useContext(UserNameContext);

    function handleSubmitPost(event) {
        event.preventDefault();
        setLoading(true);

        fetch('/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({
                poster: loggedInUser,
                content: content
            }),
            credentials: 'include',        
        })
            .then(response => response.json())
            .then(result => {
                console.log(result.message || result.error);

                fetch('/get-posts')
                .then(response => response.json())
                .then(updatedPosts => {
                    setAllPosts(updatedPosts);
                });

                setContent("");
                setLoading(false);
        });
    }

    return (
        <div className="new-post">
            <h4>New Post</h4>
            <form onSubmit={handleSubmitPost}>
                <textarea
                    className="form-control"
                    value={content}
                    onChange={(e)=>setContent(e.target.value)}
                    rows="3"
                />
                <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Posting..." : "Post"}</button>
            </form>
        </div>
    );
}


function Post({onUserClicked, post }) {
    // console.log("[Debug] Post data: ", post);

    return(
        <div className="post">
            <a href={`/profile/${post.poster}`} onClick={(e) => {
                e.preventDefault();
                onUserClicked(post.poster)
            }}>
                    <h5>{post.poster}</h5></a>
            <p className="p-grey">{post.timestamp}</p>
            <p>{post.contents}</p>
            <Like />
            <a href="#">Edit</a>
            <p className="p-grey">Comment</p>
        </div>
    );
}


function Following({onUserClicked}) {
    const [followingPosts, setFollowingPosts] = React.useState([]);

    React.useEffect(() => {
        fetch('/get-posts/following')
            .then(response => response.json())
            .then(posts => {
                setFollowingPosts(posts);
            })
            .catch(error => console.error("Error fetching following posts", error));

    }, []);

    return (
        <div className="following-posts">
            {followingPosts && followingPosts.map((post) => (
                <Post key={post.id} onUserClicked={onUserClicked} post={post} />
            ))}
        </div>
    );
}


function UserProfile({onUserClicked, user}) {
    const [followerNo, setFollowerNo] = React.useState(0);
    const [followingNo, setFollowingNo] = React.useState(0);
    const [isFollower, setIsFollower] = React.useState(false);
    const [userPosts, setUserPosts] = React.useState([]);
    const loggedInUser = React.useContext(UserNameContext);

    function handleFollow() {
        fetch('/follow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({
                followingUser: user,
            }),
            credentials: 'include',
        })
            .then(response => response.json())
            .then(result => {
                console.log(result.message || result.error);

                fetch(`/get-profile-info/${user}`)
                .then(response => response.json())
                .then(info => {
                    setFollowerNo(info.follower_no);
                    setFollowingNo(info.following_no);
                    setIsFollower(info.is_follower);
                })
            })

        setIsFollower(!isFollower);
    }

    React.useEffect(()=> {
        if (!user) return;

        fetch(`/get-profile-info/${user}`)
            .then(response => response.json())
            .then(info => {
                setFollowerNo(info.follower_no);
                setFollowingNo(info.following_no);
                setIsFollower(info.is_follower);
                // console.log("[Debug] isFollower: ", info.is_follower);
            })
        
        fetch(`/get-posts/profile/${user}`)
            .then(response => response.json())
            .then(posts => {
                console.log("[Debug] Fetching posts at UserProfile:", posts);
                setUserPosts(posts);
                console.log("[Debug] After setUserPosts:", userPosts);
            })
            .catch(error => console.error({"Error fetching posts": error}));

    }, [user]);

    return (
        <div className="profile">
            <div className="profile-info">
                <h2>{user}</h2>
                <p>{followerNo} follower | {followingNo} following</p>
                {
                    loggedInUser !== user &&
                    <button 
                    onClick={handleFollow}
                    type="button"
                    className="btn btn-outline-dark">
                    {isFollower ? "Unfollow" : "Follow"}
                    </button>
                }
            </div>
            <div className="user-posts">
                {/* {userPosts.map(post => <p key={post.id}>{post.contents}</p>)} */}
                {userPosts.length > 0 ? (userPosts.map(post => (
                    <Post key={post.id} onUserClicked={onUserClicked} post={post} />
                ))) : <p>No posts to display!</p>}
            </div>
        </div>
    );
}


function Like() {
    const [liked, setLiked] = React.useState(false);

    function handleLike() {
        setLiked(!liked);
    }

    return (
        <div className='like'>
            <span 
                className={liked? "fa fa-heart" : "fa fa-heart-o"}
                onClick={handleLike}
                aria-hidden="true">
            </span>
            <span 
                className="badge">
                0
            </span>
        </div>
    );
}


function loadPost() {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<SocialNetworkApp />);
}


// Ensure that the component only loads after the DOM is fully loaded
window.onload = function() {
    loadPost();
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