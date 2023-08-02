using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class MenuScripts : MonoBehaviour
{
    public void StartGame()
    {
        
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
    }

    public void SelectLevel()
    {
        // TODO: Add select level menu
    }

    public void Options()
    {
        // TODO: Add options to tune the sound volume
    }

    public void QuitGame()
    {
        Application.Quit();
    }
}
