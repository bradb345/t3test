import { db } from '~/server/db';
import { Navbar } from '~/components/Navbar';

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const users = await db.query.user.findMany({
    orderBy: (model, { desc }) => desc(model.id),
  })

  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-orange-300 text-white pt-16">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            AI tests work!
          </h1>
          <p className="text-lg">
            This is AI edited text.
          </p>

          {users.map((user) => (<p className="text-lg" key={user.id}>{user.name}</p>))}
        </div>
      </main>
    </>
  );
}
