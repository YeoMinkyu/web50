const UserNameContext = React.createContext("");
const CurrentViewContext = React.createContext("all");
const PostsContext = React.createContext();


function SocialNetworkApp() {
    const [posts, setPosts] = React.useState([]);
    const [currentView, setCurrentView] = React.useState("all");
    const [loggedInUser, setLoggedInUser] = React.useState("");
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [paginationInfo, setPaginationInfo] = React.useState({
        hasPrevious: false,
        previousPageNumber: null,
        pageNumber: 1,
        wholePagesNumber: 1,
        hasNext: false,
        nextPageNumber: null
    });

    function handlePageChange(pageNumber, view = currentView) {
        // console.log(`[Debug] handlePageChange called for view: ${view}, pageNumber: ${pageNumber}`);
        let url = view === "profile"
            ? `/get-posts/${view}/${selectedUser}/${pageNumber}`
            : `/get-posts/${view}/${pageNumber}`;
    
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // console.log("[Debug] API response Posts:", data.posts);
                // console.log("[Debug] API response Pagination:", data.pagination);
                setPosts(data.posts);
                setPaginationInfo({
                    hasPrevious: data.pagination.has_previous,
                    previousPageNumber: data.pagination.previous_page_number,
                    pageNumber: data.pagination.page_number,
                    wholePagesNumber: data.pagination.whole_pages_number,
                    hasNext: data.pagination.has_next,
                    nextPageNumber: data.pagination.next_page_number
                });
            })
            .catch(error => console.error("Error fetching posts:", error));
    }
    

    function handleUserClick(user) {
        // console.log("[Debug] handleUserClick user:", user);
        navigate(`/profile/${user}`);
    }

    React.useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;

            // console.log("[Debug] Path name", path);
            if(path === "/following") {
                // console.log("[Debug] setCurrentView", path);   
                setCurrentView("following");
                // console.log("[Debug] Navigated to:", currentView);           
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
        // console.log(`[Debug] Navigating to: ${path}`);
        const newView = path.startsWith("/following") ? "following" : 
                        path.startsWith("/profile") ? "profile" : "all";

        setCurrentView(newView); // Update state before triggering a fetch
        window.history.pushState({}, "", path);

        // Trigger popstate manually
        const popStateEvent = new PopStateEvent("popstate");
        dispatchEvent(popStateEvent);
    }

    // Fetch logged-in user on mount
    React.useEffect(() => {
        fetch('/get-username')
            .then(response => response.json())
            .then(data => {
                setLoggedInUser(data.username);
            })
            .catch(error => console.error("Error fetching username:", error));
    }, []);

    React.useEffect(() => {
        // console.log(`[Debug] currentView changed to: ${currentView}`);
        if (currentView === "following" || currentView === "all" || currentView === "profile") {
            setPaginationInfo({
                hasPrevious: false,
                previousPageNumber: null,
                pageNumber: 1,
                wholePagesNumber: 1,
                hasNext: false,
                nextPageNumber: null
            });
            handlePageChange(1, currentView);
        }
    }, [currentView]);

    // console.log("[Debug] loggedInUser: ", loggedInUser);

    return (
        <div>
            <UserNameContext.Provider value={loggedInUser}>
                <CurrentViewContext.Provider value={currentView}>
                    <PostsContext.Provider value={{posts, setPosts}}>
                    {loggedInUser && currentView === "all" && <NewPost/>}
                    {currentView === "all" && 
                        <AllPosts onUserClicked={handleUserClick} paginationInfo={paginationInfo} onPageChange={handlePageChange}/>}
                    {currentView === "following" && 
                        <AllPosts onUserClicked={handleUserClick} paginationInfo={paginationInfo} onPageChange={handlePageChange}/>}
                    {currentView === "profile" && selectedUser && <UserProfile onUserClicked={handleUserClick} user={selectedUser}/>}
                    {currentView === "profile" && 
                        <AllPosts onUserClicked={handleUserClick} paginationInfo={paginationInfo} onPageChange={handlePageChange}/>}
                    </PostsContext.Provider>
                </CurrentViewContext.Provider>
            </UserNameContext.Provider>
        </div>
    );
}


function Pagination({paginationInfo: paginationProps, onPageChange}) {
    const currentView = React.useContext(CurrentViewContext);
    const pageNumbers = Array.from({length: paginationProps.wholePagesNumber}, (_, i) => i + 1);
    // console.log("[Debug] paginationProps:", paginationProps);
    // console.log("[Debug] pageNumbers: ", pageNumbers);
    // console.log("[Debug] currentView: ", currentView);
    

    return (
        // Pagination
        <nav aria-label="...">
            <ul className="pagination">
                <li className={paginationProps.hasPrevious ? "page-item" : "page-item disabled"}>
                <a  className="page-link"
                    href={`/get-posts/${currentView}/${paginationProps.previousPageNumber}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // console.log("[Debug] Previous page clicked:", paginationProps.previousPageNumber);
                        onPageChange(paginationProps.previousPageNumber, currentView);
                    }}
                    tabIndex={paginationProps.hasPrevious ? "0" : "-1"}
                    aria-disabled={`${!paginationProps.hasPrevious}`}>
                        Previous
                </a>
                </li>
                {pageNumbers.map((number) => {
                    return(
                        <li key={number} className={paginationProps.pageNumber === number ? "page-item active" : "page-item"}>
                            <a  className="page-link"
                                href={`/get-posts/${currentView}/${number}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    // console.log("[Debug] Page number clicked:", number);
                                    onPageChange(number, currentView);
                                }}>
                                {number}
                                {paginationProps.pageNumber === number && <span className="sr-only">(current)</span>}
                            </a>
                        </li>
                    )
                })}
                <li className={paginationProps.hasNext ? "page-item" : "page-item disabled"}>
                <a  className="page-link"
                    href={`/get-posts/${currentView}/${paginationProps.nextPageNumber}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // console.log("[Debug] Next page clicked:", paginationProps.nextPageNumber);
                        onPageChange(paginationProps.nextPageNumber, currentView);
                    }}
                    tabIndex={paginationProps.hasNext ? "0" : "-1"}
                    aria-disabled={`${!paginationProps.hasNext}`}>
                    Next
                </a>
                </li>
            </ul>
        </nav>
    );
}


function NewPost() {
    const setPosts = React.useContext(PostsContext).setPosts;

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

                fetch('/get-posts/all')
                .then(response => response.json())
                .then(data => {
                    setPosts(data.posts);
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


function AllPosts({onEditClicked, onUserClicked, paginationInfo, onPageChange}) {
    const posts = React.useContext(PostsContext).posts;
    
    return (
        <div className="all-post">
            {posts && posts.map((post) => (
                <Post key={post.id} onEditClicked={onEditClicked} onUserClicked={onUserClicked} post={post}/>
            ))}
            <Pagination paginationInfo={paginationInfo} onPageChange={onPageChange}/>
        </div>

    )
}

function Post({onUserClicked, post}) {
    const loggedInUser = React.useContext(UserNameContext);
    const {posts, setPosts} = React.useContext(PostsContext);
    const [editMode, setEditMode] = React.useState(false);
    const [content, setContent] = React.useState(post.contents);

    // console.log("[Debug] Post data: ", post);
    console.log("[Debug] Logged in user: ", loggedInUser);
    console.log("[Debug] Post data: ", post.poster);

    function handleEdit(event) {
        // console.log("[Debug] handleEdit called");
        event.preventDefault();

        fetch(`/edit-post/${post.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({
                content: content
            }),
            credentials: "include",
        })
            .then(response => response.json())
            .then(result => {
                console.log(result.message || result.error);

                fetch('/get-posts/all')
                .then(response => response.json())
                .then(data => {
                    setPosts(data.posts);
                });
            });

        setEditMode(!editMode);
    }

    return(
        <div className="post">
            <a href={`/profile/${post.poster}`} onClick={(e) => {
                e.preventDefault();
                // console.log("[Debug] poster clicked:", post.poster);
                onUserClicked(post.poster)
            }}>
                    <h5>{post.poster}</h5></a>
            <p className="p-grey">{post.timestamp}</p>
            {!editMode && <p>{content}</p>}
            <Like post={post}/>
            {loggedInUser === post.poster && editMode ? (
                <form onSubmit={handleEdit}>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)}/>
                    <button
                        className="btn btn-outline-dark save-post-btn"
                        type="submit"
                    > 
                        Save
                    </button>
                    <button
                        className="btn btn-outline-dark cancel-post-btn"
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setEditMode(false);
                            setContent(post.contents);
                        }}
                    >
                        Cancel
                    </button>
                </form>         
                )  
             :
             <button 
                className="btn btn-outline-dark edit-post-btn"
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setEditMode(!editMode);
                }}
                >
                    Edit
                </button>
            }            
        </div>
    );
}


function UserProfile({user}) {
    const [followerNo, setFollowerNo] = React.useState(0);
    const [followingNo, setFollowingNo] = React.useState(0);
    const [isFollower, setIsFollower] = React.useState(false);
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
        </div>
    );
}


function Like({post}) {
    const [liked, setLiked] = React.useState(false);
    const [likes, setLikes] = React.useState(0);
    const [loading, setLoading] = React.useState(false);


    async function fetchLikes() {
        try {
            const response = await fetch(`/like/${post.id}`);

            if (!response.ok) throw new Error("Failed to fetch likes.");
            
            const data = await response.json();

            setLiked(data.liked);
            setLikes(data.likes);
        } catch (error) {
            console.error("Error fetching likes: ", error);
        }
    }

    async function handleLike() {
        if (loading) return;

        setLoading(true);

        try {
            const response = await fetch(`/like/${post.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({
                    liked: !liked
                }),
                credentials: 'include', 
            })

            if (!response.ok) throw new Error("Faild to post data");

            await fetchLikes();
        } catch (error) {
            console.error("Error posting likes: ", error)
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        fetchLikes();
    },[post.id])

    return (
        <div className='like'>
            <span 
                className={`fa ${liked? "fa-heart" : "fa-heart-o"} ${loading ? "disabled" : ""}`}
                onClick={handleLike}
                aria-hidden="true"
                style={{cursor: loading ? "not-allowed" : "pointer"}}
                >
            </span>
            <span 
                className="badge">
                {likes}
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