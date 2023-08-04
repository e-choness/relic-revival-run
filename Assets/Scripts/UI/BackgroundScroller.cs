using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UI
{
    public class BackgroundScroller : MonoBehaviour
    {
        private List<Vector2> waypoints;
        [SerializeField] private float movingSpeed;
        [SerializeField] private int levelIndex;
        private int index;

        // private enum Level
        // {
        //     Mexico = 1,
        //     China = 2,
        //     Portugal = 3
        // }
        
        // Start is called before the first frame update
        void Start()
        {
            // Mexico Level waypoints
            if (levelIndex == 1)
            {
                waypoints = new List<Vector2>
                {
                    new Vector2(9.0f, -19.2f),
                    new Vector2(-21.5f, -19.2f),
                    new Vector2(-24.7f, -8.5f),
                    new Vector2(11.3f, -8.1f),
                    new Vector2(15.2f, 6.2f),
                    new Vector2(-26.0f, 6.2f)
                };
            }
            
            // China level waypoints
            if (levelIndex == 2)
            {
                waypoints = new List<Vector2>
                {
                    new Vector2(5.1f, 3.4f),
                    new Vector2(-216.7f, 3.4f)
                };
            }
            
            // Portugal level waypoints
            if (index == 3)
            {
                // TODO: add portugal level waypoints
            }
            
            index = 0;
            transform.position = waypoints[index];
            index++;
        }

        // Update is called once per frame
        void Update()
        {
            MoveBackground();
        }

        private void MoveBackground()
        {
            if (Vector2.Distance(waypoints[index], transform.position) < 0.1f)
            {
                index++;
                if (index >= waypoints.Count)
                {
                    GoToNextLevel();
                }
            }
            if(index < waypoints.Count)
                transform.position = Vector2.MoveTowards(transform.position,
                    waypoints[index],
                    movingSpeed * Time.deltaTime);
        }

        private void GoToNextLevel()
        {
            Time.timeScale = 0.0f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
        }
    }
}
