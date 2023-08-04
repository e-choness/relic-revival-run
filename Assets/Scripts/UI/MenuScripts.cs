using System;
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
        
        // The implementation is in player input script
        public void ResumeGame()
        {
            
        }

        public void QuitGame()
        {
            Application.Quit();
        }

        public void BackToMain()
        {
            SceneManager.LoadScene(0);
        }
    }
}

