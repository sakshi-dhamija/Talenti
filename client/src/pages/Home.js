import useDocumentTitle from "../hooks/useDocumentTitle";

const Home = () => {
  useDocumentTitle("TalentI");
  return (
    <main className="pt-32 pb-12">
      <h2 className="text-center font-bold text-2xl">
        Welcome! <br />
        To TalentI: The Interview Creation Portal
      </h2>
    </main>
  );
};

export default Home;
