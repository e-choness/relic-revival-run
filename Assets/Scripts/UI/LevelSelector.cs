using UnityEngine;
using UnityEngine.SceneManagement;

namespace UI
{
    public class LevelSelector : MonoBehaviour
    {
        public void LoadMexico()
        {
            // TODO: Load Mexico Level
            SceneManager.LoadScene(1);
        }

        public void LoadChina()
        {
            // TODO: Load China Level
            SceneManager.LoadScene(2);
        }

        public void LoadPortugal()
        {
            // TODO: Load Portugal Level
            SceneManager.LoadScene(3);
        }
    }
}
