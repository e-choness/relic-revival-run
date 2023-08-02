using UnityEngine;
using UnityEngine.SceneManagement;

namespace UI
{
    public class MenuScripts : MonoBehaviour
    {
    
        public void StartGame()
        {
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
        }

        public void QuitGame()
        {
            Application.Quit();
        }
    }
}

