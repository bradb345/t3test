// import Link from "next/link";
import {db} from '~/server/db';

export default async function HomePage() {

  const posts = await db.query.posts.findMany();
  console.log('posts:', posts)


  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-orange-300 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          Testing things!
        </h1>
        <p className="text-lg">
          This is a test page to see how things work.
        </p>

        {posts.map((post) => (<p className="text-lg" key={post.id}>{post.name}</p>))}
        
      </div>
    </main>
  );
}
